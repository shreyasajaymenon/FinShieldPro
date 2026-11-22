package com.finshield.model;

import java.util.List;
import java.util.Map;

public record ScreeningResponse(
    int totalProcessed,
    int validTransactions,
    int invalidSkipped,
    int bloomNegativeInstantPasses,
    int bloomTruePositives,
    int bloomFalsePositivesCaught,
    double percentile95ThresholdInr,
    Map<String, List<String>> detectedMuleRings,
    List<FlaggedAlert> alerts,
    Map<String, Double> stageLatencyMs
) {
    public record FlaggedAlert(
        String txId,
        String senderVpa,
        String receiverVpa,
        double amountInr,
        String reason,
        String algorithmUsed
    ) {}
}