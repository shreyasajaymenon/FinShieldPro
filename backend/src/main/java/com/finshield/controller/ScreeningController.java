package com.finshield.controller;

import com.finshield.model.ScreeningResponse;
import com.finshield.model.UpiTransaction;
import com.finshield.service.FraudScreeningService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ScreeningController {
    private final FraudScreeningService service;

    public ScreeningController(FraudScreeningService service) {
        this.service = service;
    }

    @PostMapping("/screen")
    public ScreeningResponse screenTransactions(@RequestBody List<UpiTransaction> transactions) {
        return service.screenBatch(transactions);
    }

    @PostMapping("/webhook/upi-auth")
    public Map<String, Object> authorizeWebhook(@RequestBody UpiTransaction transaction) {
        return service.authorizeLivePayment(transaction);
    }

    @GetMapping("/dataset/paysim")
    public ScreeningResponse screenPaySim() {
        return service.screenPaySimDataset();
    }

    @GetMapping("/sample/{count}")
    public ScreeningResponse screenSample(@PathVariable int count) {
        int safeCount = Math.min(Math.max(count, 1), 25_000);
        return service.screenBatch(service.generateSyntheticBatch(safeCount));
    }

    @GetMapping("/benchmark")
    public List<Map<String, Object>> benchmark() {
        return service.runBenchmarks();
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return service.getEngineStats();
    }

    @PostMapping("/threat")
    public Map<String, Object> addThreat(@RequestBody Map<String, String> body) {
        return service.addThreatRule(body.get("type"), body.get("value"), body.get("label"));
    }
}