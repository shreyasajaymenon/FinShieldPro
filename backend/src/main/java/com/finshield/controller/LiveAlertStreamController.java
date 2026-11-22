package com.finshield.controller;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.finshield.model.UpiTransaction;
import com.finshield.service.FraudScreeningService;

@RestController
@RequestMapping("/api/live")
@CrossOrigin(origins = "*")
public class LiveAlertStreamController {

    private final FraudScreeningService screeningService;
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public LiveAlertStreamController(FraudScreeningService screeningService) {
        this.screeningService = screeningService;
    }

    // 1. React frontend subscribes here for instant push notifications
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAlerts() {
        SseEmitter emitter = new SseEmitter(0L); // No timeout
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        return emitter;
    }

    // 2. Razorpay / Payment Gateway pushes live UPI events here
    @PostMapping("/razorpay-webhook")
    public Map<String, Object> receiveRazorpayWebhook(@RequestBody Map<String, Object> webhookPayload) {
        // Extract payment entity from Razorpay's standard JSON structure
        Map<String, Object> payload = (Map<String, Object>) webhookPayload.getOrDefault("payload", Map.of());
        Map<String, Object> paymentWrapper = (Map<String, Object>) payload.getOrDefault("payment", Map.of());
        Map<String, Object> entity = (Map<String, Object>) paymentWrapper.getOrDefault("entity", webhookPayload);

        String txId = String.valueOf(entity.getOrDefault("id", "pay_" + System.currentTimeMillis()));
        String payerVpa = String.valueOf(entity.getOrDefault("vpa", "customer@okicici"));
        String merchantVpa = String.valueOf(entity.getOrDefault("merchant_vpa", "merchant@okhdfc"));
        String deviceId = String.valueOf(entity.getOrDefault("device_id", "UPI-APP-GATEWAY"));
        // Razorpay sends amount in paise (e.g., 50000 paise = ₹500)
        double amountPaise = Double.parseDouble(String.valueOf(entity.getOrDefault("amount", "10000")));
        double amountInr = amountPaise / 100.0;

        UpiTransaction tx = new UpiTransaction(txId, payerVpa, merchantVpa, deviceId, amountInr);
        Map<String, Object> decision = screeningService.authorizeLivePayment(tx);

        Map<String, Object> liveEvent = Map.of(
                "txId", txId,
                "payerVpa", payerVpa,
                "merchantVpa", merchantVpa,
                "amountInr", amountInr,
                "verdict", decision
        );

        // Broadcast immediately to all open browser tabs
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("upi-alert").data(liveEvent));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
        return liveEvent;
    }
}
