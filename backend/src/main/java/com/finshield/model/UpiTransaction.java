package com.finshield.model;

public record UpiTransaction(
    String txId,
    String senderVpa,
    String receiverVpa,
    String deviceId,
    double amountInr
) {}