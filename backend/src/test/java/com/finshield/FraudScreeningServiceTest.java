package com.finshield;

import com.finshield.algorithms.*;
import com.finshield.model.ScreeningResponse;
import com.finshield.model.UpiTransaction;
import com.finshield.service.FraudScreeningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class FraudScreeningServiceTest {

    private FraudScreeningService service;

    @BeforeEach
    void setUp() {
        service = new FraudScreeningService();
        service.initThreatIntelligence();
    }

    @Test
    void testBloomFilterZeroFalseNegatives() {
        BloomFilter bf = new BloomFilter(1000, 0.01);
        bf.add("scammer99@okicici");
        bf.add("dev-rooted-8812");

        assertTrue(bf.mightContain("scammer99@okicici"));
        assertTrue(bf.mightContain("SCAMMER99@OKICICI"));
        assertFalse(bf.mightContain("clean.citizen@oksbi"));
    }

    @Test
    void testCompressedRadixTreePhishingPrefixMatch() {
        RadixTree tree = new RadixTree();
        tree.insert("pmcares-relief", "Fake Govt Relief Phishing");
        tree.insert("pmcares-fund", "Secondary Phishing Variant");

        assertEquals("Fake Govt Relief Phishing", tree.matchThreatPrefix("pmcares-relief-2026@ybl"));
        assertEquals("Secondary Phishing Variant", tree.matchThreatPrefix("pmcares-fund@okicici"));
        assertNull(tree.matchThreatPrefix("zomato-merchant@paytm"));
    }

    @Test
    void testDisjointSetUnionMuleRingDetection() {
        DisjointSetUnion dsu = new DisjointSetUnion();
        dsu.union("mule1@okicici", "DEV:ROOTED-99");
        dsu.union("mule2@okicici", "DEV:ROOTED-99");
        dsu.union("mule3@okicici", "DEV:ROOTED-99");
        dsu.union("mule4@okicici", "DEV:ROOTED-99");

        Map<String, List<String>> clusters = dsu.getAllClusters(4);
        assertEquals(1, clusters.size());
        assertTrue(dsu.getClusterSize("mule1@okicici") >= 5);
    }

    @Test
    void testRandomizedQuickselectPercentileAccuracy() {
        double[] amounts = {100, 200, 300, 400, 500, 600, 700, 800, 900, 10000};
        double p90 = RandomizedQuickselect.findPercentile(amounts, 90.0);
        assertEquals(900.0, p90, 0.001);
    }

    @Test
    void testEndToEndBatchScreeningAndEdgeCases() {
        // Empty input edge case
        ScreeningResponse emptyRes = service.screenBatch(List.of());
        assertEquals(0, emptyRes.validTransactions());

        // Malformed + Duplicate + Valid Fraud cases
        List<UpiTransaction> mixed = List.of(
            new UpiTransaction("TX-BAD", "invalid-vpa", "shop@upi", "D1", 500),
            new UpiTransaction("TX-NEG", "a@upi", "b@upi", "D1", -100),
            new UpiTransaction("TX-1", "scammer99@okicici", "victim@oksbi", "D2", 12000),
            new UpiTransaction("TX-1", "scammer99@okicici", "victim@oksbi", "D2", 12000), // duplicate
            new UpiTransaction("TX-2", "user@okhdfc", "rbi-kyc-help@ybl", "D3", 25000)
        );

        ScreeningResponse res = service.screenBatch(mixed);
        assertEquals(5, res.totalProcessed());
        assertEquals(2, res.validTransactions());
        assertEquals(3, res.invalidSkipped());
        assertTrue(res.alerts().size() >= 2);
    }

    @Test
    void testRealTimeGatewayWebhookAuthorization() {
        UpiTransaction phishingTx = new UpiTransaction(
            "LIVE-1", "arjun@okicici", "pmcares-relief-2026@ybl", "PIXEL-8", 15000
        );
        Map<String, Object> verdict = service.authorizeLivePayment(phishingTx);
        assertEquals("BLOCK_FRAUD", verdict.get("decision"));
        assertTrue((int) verdict.get("riskScore") >= 70);
    }
}