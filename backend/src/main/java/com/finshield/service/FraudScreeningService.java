package com.finshield.service;

import com.finshield.algorithms.*;
import com.finshield.model.ScreeningResponse;
import com.finshield.model.ScreeningResponse.FlaggedAlert;
import com.finshield.model.UpiTransaction;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class FraudScreeningService {
    private BloomFilter bloomFilter;
    private Set<String> authoritativeBlacklist;
    private List<String> blacklistAsList;
    private RadixTree phishingRadixTree;
    private List<String> phishingPrefixesList;
    private DisjointSetUnion liveGatewayDsu;

    @PostConstruct
    public void initThreatIntelligence() {
        int watchlistSize = 50_000;
        bloomFilter = new BloomFilter(watchlistSize, 0.01);
        authoritativeBlacklist = new HashSet<>(watchlistSize);
        blacklistAsList = new ArrayList<>(watchlistSize);
        liveGatewayDsu = new DisjointSetUnion();

        List<String> knownBad = List.of(
            "scammer99@okicici", "kyc-update@ybl", "lottery-win@paytm",
            "dev-rooted-8812", "dev-emulator-9901"
        );
        for (String item : knownBad) {
            bloomFilter.add(item);
            authoritativeBlacklist.add(item);
            blacklistAsList.add(item);
        }
        for (int i = 0; i < watchlistSize; i++) {
            String fakeVpa = "fraud_mule_" + i + "@okaxis";
            bloomFilter.add(fakeVpa);
            authoritativeBlacklist.add(fakeVpa);
            blacklistAsList.add(fakeVpa);
        }

        phishingRadixTree = new RadixTree();
        phishingPrefixesList = new ArrayList<>();
        Map<String, String> threatPrefixes = Map.of(
            "pmcares-relief", "Fake Govt Relief Phishing",
            "kbc-prize", "Lottery Scam Prefix",
            "rbi-kyc", "Impersonation Handle",
            "electricity-bill-urgent", "Utility Disconnect Scam",
            "refund-dept", "Fake Refund Handle"
        );
        threatPrefixes.forEach((prefix, label) -> {
            phishingRadixTree.insert(prefix, label);
            phishingPrefixesList.add(prefix);
        });
    }

    public Map<String, Object> authorizeLivePayment(UpiTransaction tx) {
        long start = System.nanoTime();
        if (tx == null || tx.senderVpa() == null || !tx.senderVpa().contains("@")
            || tx.receiverVpa() == null || !tx.receiverVpa().contains("@") || tx.amountInr() <= 0) {
            return Map.of(
                "decision", "REJECT_INVALID",
                "riskScore", 100,
                "reasons", List.of("Malformed UPI VPA or invalid INR amount"),
                "latencyMs", 0.05
            );
        }

        int riskScore = 5;
        List<String> reasons = new ArrayList<>();
        List<String> triggeredAlgos = new ArrayList<>();

        for (String entity : List.of(tx.senderVpa(), tx.receiverVpa(), tx.deviceId() == null ? "" : tx.deviceId())) {
            if (!entity.isBlank() && bloomFilter.mightContain(entity) && authoritativeBlacklist.contains(entity)) {
                riskScore += 85;
                reasons.add("Blacklisted entity detected: " + entity);
                triggeredAlgos.add("Bloom Filter + Exact Verify (CO5)");
            }
        }

        String phishingMatch = phishingRadixTree.matchThreatPrefix(tx.receiverVpa());
        if (phishingMatch != null) {
            riskScore += 75;
            reasons.add("Phishing VPA handle: " + phishingMatch);
            triggeredAlgos.add("Compressed Radix Tree (Unit 4)");
        }

        if (tx.deviceId() != null && !tx.deviceId().isBlank()) {
            liveGatewayDsu.union(tx.senderVpa(), "DEV:" + tx.deviceId());
            liveGatewayDsu.union(tx.receiverVpa(), "DEV:" + tx.deviceId());
            int clusterSize = liveGatewayDsu.getClusterSize(tx.senderVpa());
            if (clusterSize >= 4) {
                riskScore += 60;
                reasons.add("Device linked to " + clusterSize + "-node mule cluster");
                triggeredAlgos.add("Disjoint-Set Union (Unit 2)");
            }
        }

        if (tx.amountInr() >= 50_000) {
            riskScore += 30;
            reasons.add("High-value transfer above Rs 50,000 threshold");
            triggeredAlgos.add("Threshold Anomaly Guard");
        }

        riskScore = Math.min(100, riskScore);
        String decision = riskScore >= 70 ? "BLOCK_FRAUD" : (riskScore >= 35 ? "STEP_UP_OTP" : "APPROVE");
        if (reasons.isEmpty()) {
            reasons.add("Passed Bloom Filter negative check & Radix prefix scan");
        }

        double latencyMs = round3((System.nanoTime() - start) / 1_000_000.0);
        return Map.of(
            "txId", tx.txId() == null ? "LIVE-" + System.currentTimeMillis() : tx.txId(),
            "decision", decision,
            "riskScore", riskScore,
            "reasons", reasons,
            "algorithmsTriggered", triggeredAlgos,
            "latencyMs", latencyMs
        );
    }

    public ScreeningResponse screenPaySimDataset() {
        List<UpiTransaction> records = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(new ClassPathResource("data/paysim_sample.csv").getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean header = true;
            while ((line = br.readLine()) != null) {
                if (header) { header = false; continue; }
                String[] parts = line.split(",");
                if (parts.length >= 5) {
                    records.add(new UpiTransaction(
                        parts[0].trim(), parts[1].trim(), parts[2].trim(),
                        parts[3].trim(), Double.parseDouble(parts[4].trim())
                    ));
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to load bundled PaySim dataset: " + e.getMessage(), e);
        }
        return screenBatch(records);
    }

    public ScreeningResponse screenBatch(List<UpiTransaction> batch) {
        if (batch == null || batch.isEmpty()) {
            return new ScreeningResponse(0, 0, 0, 0, 0, 0, 0.0, Map.of(), List.of(), Map.of());
        }

        Set<String> seenTxIds = new HashSet<>();
        List<UpiTransaction> validList = new ArrayList<>();
        int invalidCount = 0;

        for (UpiTransaction tx : batch) {
            if (tx == null || tx.txId() == null || !seenTxIds.add(tx.txId())
                || tx.senderVpa() == null || !tx.senderVpa().contains("@")
                || tx.receiverVpa() == null || !tx.receiverVpa().contains("@")
                || tx.amountInr() <= 0) {
                invalidCount++;
                continue;
            }
            validList.add(tx);
        }

        if (validList.isEmpty()) {
            return new ScreeningResponse(batch.size(), 0, invalidCount, 0, 0, 0, 0.0, Map.of(), List.of(), Map.of());
        }

        List<FlaggedAlert> alerts = new ArrayList<>();
        int bloomNegatives = 0, bloomTruePos = 0, bloomFalsePos = 0;

        long t1 = System.nanoTime();
        for (UpiTransaction tx : validList) {
            for (String entity : List.of(tx.senderVpa(), tx.receiverVpa(), tx.deviceId())) {
                if (entity == null) continue;
                if (!bloomFilter.mightContain(entity)) {
                    bloomNegatives++;
                } else if (authoritativeBlacklist.contains(entity)) {
                    bloomTruePos++;
                    alerts.add(new FlaggedAlert(tx.txId(), tx.senderVpa(), tx.receiverVpa(),
                        tx.amountInr(), "Blacklisted Entity: " + entity, "Bloom Filter + HashSet Verify (CO5)"));
                } else {
                    bloomFalsePos++;
                }
            }
        }
        double bloomMs = (System.nanoTime() - t1) / 1_000_000.0;

        long t2 = System.nanoTime();
        for (UpiTransaction tx : validList) {
            String threat = phishingRadixTree.matchThreatPrefix(tx.receiverVpa());
            if (threat != null) {
                alerts.add(new FlaggedAlert(tx.txId(), tx.senderVpa(), tx.receiverVpa(),
                    tx.amountInr(), "Phishing Handle (" + threat + ")", "Radix Tree (Unit 4)"));
            }
        }
        double radixMs = (System.nanoTime() - t2) / 1_000_000.0;

        long t3 = System.nanoTime();
        DisjointSetUnion dsu = new DisjointSetUnion();
        for (UpiTransaction tx : validList) {
            if (tx.deviceId() != null && !tx.deviceId().isBlank()) {
                dsu.union(tx.senderVpa(), "DEV:" + tx.deviceId());
                dsu.union(tx.receiverVpa(), "DEV:" + tx.deviceId());
            }
        }
        Map<String, List<String>> muleRings = dsu.getAllClusters(4);
        for (UpiTransaction tx : validList) {
            if (dsu.getClusterSize(tx.senderVpa()) >= 4) {
                alerts.add(new FlaggedAlert(tx.txId(), tx.senderVpa(), tx.receiverVpa(),
                    tx.amountInr(), "Shared-Device Mule Ring (Size: " + dsu.getClusterSize(tx.senderVpa()) + ")", "Disjoint-Set Union (Unit 2)"));
            }
        }
        double dsuMs = (System.nanoTime() - t3) / 1_000_000.0;

        long t4 = System.nanoTime();
        double[] amounts = validList.stream().mapToDouble(UpiTransaction::amountInr).toArray();
        double p95 = RandomizedQuickselect.findPercentile(amounts, 95.0);
        for (UpiTransaction tx : validList) {
            if (tx.amountInr() > p95 && tx.amountInr() >= 50_000) {
                alerts.add(new FlaggedAlert(tx.txId(), tx.senderVpa(), tx.receiverVpa(),
                    tx.amountInr(), "95th Percentile Whale Spike (> Rs " + Math.round(p95) + ")", "Randomized Quickselect (CO5)"));
            }
        }
        double quickselectMs = (System.nanoTime() - t4) / 1_000_000.0;

        Map<String, Double> latencies = Map.of(
            "bloomFilterMs", round3(bloomMs),
            "radixTreeMs", round3(radixMs),
            "dsuClusteringMs", round3(dsuMs),
            "randomizedQuickselectMs", round3(quickselectMs)
        );

        return new ScreeningResponse(
            batch.size(), validList.size(), invalidCount,
            bloomNegatives, bloomTruePos, bloomFalsePos,
            round3(p95), muleRings, alerts, latencies
        );
    }

    public List<Map<String, Object>> runBenchmarks() {
        int[] sizes = {1_000, 10_000, 50_000};
        List<Map<String, Object>> results = new ArrayList<>();

        for (int n : sizes) {
            List<UpiTransaction> synthetic = generateSyntheticBatch(n);
            double[] amounts = synthetic.stream().mapToDouble(UpiTransaction::amountInr).toArray();

            long t1 = System.nanoTime();
            for (UpiTransaction tx : synthetic) {
                if (bloomFilter.mightContain(tx.senderVpa())) {
                    authoritativeBlacklist.contains(tx.senderVpa());
                }
            }
            double bloomMs = (System.nanoTime() - t1) / 1_000_000.0;

            long t2 = System.nanoTime();
            int sampleLimit = Math.min(n, 2000);
            for (int i = 0; i < sampleLimit; i++) {
                blacklistAsList.contains(synthetic.get(i).senderVpa());
            }
            double linearBaselineMs = ((System.nanoTime() - t2) / 1_000_000.0) * ((double) n / sampleLimit);

            long t3 = System.nanoTime();
            RandomizedQuickselect.findPercentile(amounts, 99.0);
            double quickselectMs = (System.nanoTime() - t3) / 1_000_000.0;

            long t4 = System.nanoTime();
            double[] copy = amounts.clone();
            Arrays.sort(copy);
            double sortBaselineMs = (System.nanoTime() - t4) / 1_000_000.0;

            results.add(Map.of(
                "inputSize", n,
                "bloomFilterMs", round3(bloomMs),
                "linearBaselineMs", round3(linearBaselineMs),
                "quickselectMs", round3(quickselectMs),
                "fullSortBaselineMs", round3(sortBaselineMs)
            ));
        }
        return results;
    }

    public List<UpiTransaction> generateSyntheticBatch(int count) {
        List<UpiTransaction> list = new ArrayList<>(count);
        Random rand = new Random(42);
        for (int i = 0; i < count; i++) {
            if (i % 25 == 0) {
                list.add(new UpiTransaction("TXN-" + i, "user" + i + "@okhdfc", "pmcares-relief-" + i + "@ybl", "DEV-CLEAN-" + i, 1500 + rand.nextInt(5000)));
            } else if (i % 40 == 0) {
                list.add(new UpiTransaction("TXN-" + i, "mule_acc_" + (i % 6) + "@okicici", "collector@paytm", "DEV-SHARED-MULE-01", 85000 + rand.nextInt(50000)));
            } else if (i == 7) {
                list.add(new UpiTransaction("TXN-" + i, "scammer99@okicici", "victim@oksbi", "DEV-CLEAN-7", 12000));
            } else {
                list.add(new UpiTransaction("TXN-" + i, "citizen_" + i + "@oksbi", "merchant_" + (i % 500) + "@paytm", "DEV-USER-" + i, 100 + rand.nextInt(4000)));
            }
        }
        return list;
    }

    public Map<String, Object> getEngineStats() {
        return Map.of(
            "bloomBitArraySize", bloomFilter.getBitArraySize(),
            "bloomHashFunctions", bloomFilter.getNumHashFunctions(),
            "bloomEstimatedFpRate", Math.round(bloomFilter.getEstimatedFalsePositiveRate() * 100000.0) / 100000.0,
            "authoritativeBlacklistCount", authoritativeBlacklist.size(),
            "radixCompressedNodes", phishingRadixTree.getCompressedNodeCount(),
            "activePhishingPrefixes", phishingPrefixesList
        );
    }

    public Map<String, Object> addThreatRule(String type, String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Threat value cannot be empty.");
        }
        String cleanVal = value.trim().toLowerCase();
        if ("blacklist".equalsIgnoreCase(type)) {
            bloomFilter.add(cleanVal);
            authoritativeBlacklist.add(cleanVal);
            blacklistAsList.add(cleanVal);
        } else if ("prefix".equalsIgnoreCase(type)) {
            String threatLabel = (label == null || label.isBlank()) ? "Custom Phishing Prefix" : label.trim();
            phishingRadixTree.insert(cleanVal, threatLabel);
            if (!phishingPrefixesList.contains(cleanVal)) {
                phishingPrefixesList.add(cleanVal);
            }
        } else {
            throw new IllegalArgumentException("Invalid threat type. Use 'blacklist' or 'prefix'.");
        }
        return getEngineStats();
    }

    private double round3(double v) { return Math.round(v * 1000.0) / 1000.0; }
}