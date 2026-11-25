# FinShield Pro — Real-Time UPI Fraud & Mule-Ring Screening Engine

**FinShield Pro** is an enterprise-grade, sub-millisecond Unified Payments Interface (UPI) fraud detection and mule-ring screening engine built with a **Java 21 + Spring Boot** algorithmic backend and a **React 18 + Vite** interactive Command Center.

All four core algorithms are implemented from scratch in pure Java (`com.finshield.algorithms`) without external algorithmic black-box libraries:
* **Bloom Filter with Double Hashing ($O(k)$):** Probabilistic watchlist pre-screening ($m = 479,253$ bits, $k = 7$ hashes, $1\%$ target false-positive rate) backed by an authoritative `HashSet` for zero false negatives.
* **Compressed Radix Tree / Patricia Trie ($O(L)$):** Path-compressed prefix matching to detect lookalike phishing VPAs (e.g., `pmcares-relief-*`, `rbi-kyc-*`, `kbc-prize-*`).
* **Disjoint-Set Union / Union-Find ($O(\alpha(n))$ amortized):** Path compression + union by rank to cluster shared-device money-mule rings ($\ge 4$ linked entities).
* **Randomized Quickselect ($O(n)$ expected):** Linear-time order-statistic selection for dynamic 95th-percentile whale-spike thresholding without $O(n \log n)$ full sorting.

---

## 1. Repository Structure

```text
FinShieldPro/
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/finshield/
│       │   ├── FinShieldApplication.java
│       │   ├── algorithms/
│       │   │   ├── BloomFilter.java
│       │   │   ├── CompressedRadixTree.java  (RadixTree.java)
│       │   │   ├── DisjointSetUnion.java
│       │   │   └── RandomizedQuickselect.java
│       │   ├── controller/
│       │   │   └── ScreeningController.java
│       │   ├── model/
│       │   │   ├── ScreeningResponse.java
│       │   │   └── UpiTransaction.java
│       │   └── service/
│       │       └── FraudScreeningService.java
│       └── resources/
│           └── data/
│               └── paysim_sample.csv
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       └── main.jsx
└── README.md
```

---

## 2. Prerequisites

Ensure the following tools are installed before building locally:

| Tool | Minimum Version | Verification Command |
| :--- | :--- | :--- |
| **Java Development Kit (JDK)** | Java 21 (LTS) | `java -version` |
| **Apache Maven** | 3.9+ | `mvn -version` |
| **Node.js & npm** | Node 18+ / npm 9+ | `node -v && npm -v` |
| **Docker** *(optional)* | 24.0+ | `docker --version` |

---

## 3. Environment Variables (No Secrets Required)

FinShield Pro requires **zero secret API keys** out of the box. Configure only the non-sensitive routing variables below when deploying across separate hosts:

### Frontend (`frontend/.env`)
```env
# Local development (default fallback if omitted)
VITE_API_URL=http://localhost:8080/api

# Production deployment (Vercel -> Render)
# VITE_API_URL=https://finshieldpro.onrender.com/api
```

### Backend (`backend/src/main/resources/application.properties` or Cloud Env)
```properties
# Server port (automatically overridden by Render's PORT variable in Docker)
SERVER_PORT=8080
```

---

## 4. Build & Run Instructions

### Option A: Local Development (Two Terminals)

#### 1. Start the Java 21 Spring Boot Backend
```bash
cd backend
mvn clean spring-boot:run
```
*Wait until the console prints `Started FinShieldApplication`. The API server is now active at `http://localhost:8080/api`.*

#### 2. Start the React + Vite Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser. The bottom-left **JAVA CORE ENGINE** badge will display **CONNECTED**.*

---

### Option B: Docker Container Build (Backend)
```bash
cd backend
docker build -t finshield-backend .
docker run -p 8080:8080 finshield-backend
```

---

## 5. REST API Reference & `curl` Examples

### 5.1 Real-Time Payment Gateway Webhook (`POST /api/webhook/upi-auth`)
Evaluates a single incoming UPI payment intent in $< 5\text{ ms}$ and returns an authorization verdict (`APPROVE`, `STEP_UP_OTP`, or `BLOCK_FRAUD`).

```bash
curl -X POST http://localhost:8080/api/webhook/upi-auth \
  -H "Content-Type: application/json" \
  -d '{
    "txId": "UPI-2026-88412",
    "senderVpa": "shrey.patel@okicici",
    "receiverVpa": "pmcares-relief-2026@ybl",
    "deviceId": "ONEPLUS-12R-991",
    "amountInr": 15000
  }'
```

**Sample Response:**
```json
{
  "txId": "UPI-2026-88412",
  "decision": "BLOCK_FRAUD",
  "riskScore": 80,
  "reasons": [
    "Phishing VPA handle: Fake Govt Relief Phishing"
  ],
  "algorithmsTriggered": [
    "Compressed Radix Tree (Unit 4)"
  ],
  "latencyMs": 0.142
}
```

### 5.2 Batch Transaction Screening (`POST /api/screen`)
Validates, deduplicates, and screens an array of UPI transactions across all four algorithmic stages.

```bash
curl -X POST http://localhost:8080/api/screen \
  -H "Content-Type: application/json" \
  -d '[
    {"txId": "T-101", "senderVpa": "scammer99@okicici", "receiverVpa": "victim@oksbi", "deviceId": "DEV-01", "amountInr": 12000},
    {"txId": "T-102", "senderVpa": "arjun@okhdfc", "receiverVpa": "zomato@paytm", "deviceId": "DEV-02", "amountInr": 450}
  ]'
```

### 5.3 Additional Endpoints
* `GET /api/dataset/paysim` — Loads and screens the bundled Kaggle PaySim dataset (`paysim_sample.csv`).
* `GET /api/sample/{count}` — Generates and screens `1` to `25,000` seeded synthetic UPI records (`Random(42)`).
* `GET /api/benchmark` — Executes live JVM microbenchmarks across $N \in \{1,000,\; 10,000,\; 50,000\}$.
* `GET /api/stats` — Returns Bloom Filter bit-array size ($m$), hash count ($k$), false-positive rate, and Radix node count.
* `POST /api/threat` — Hot-inserts a new blacklisted entity or phishing prefix into JVM memory:
  ```bash
  curl -X POST http://localhost:8080/api/threat \
    -H "Content-Type: application/json" \
    -d '{"type": "prefix", "value": "modi-yojana-free", "label": "Fake Govt Subsidy"}'
  ```

---

## 6. Representative Test Dataset (`paysim_sample.csv`)

A mapped Kaggle PaySim mobile-money dataset is bundled at `backend/src/main/resources/data/paysim_sample.csv` and can also be uploaded directly via the **Batch & CSV Inspector** tab:

```csv
txId,senderVpa,receiverVpa,deviceId,amountInr
PAYSIM-1001,C1231006815@okicici,M1979787155@paytm,DEV-ANDROID-101,9839.64
PAYSIM-1003,C1305486145@okhdfc,C553264065@okicici,DEV-EMULATOR-9901,181.00
PAYSIM-1006,C90045638@oksbi,pmcares-relief-fund@ybl,DEV-ANDROID-882,25000.00
PAYSIM-1010,C712410124@okaxis,rbi-kyc-update@okicici,DEV-ANDROID-919,49500.00
PAYSIM-1012,C249177573@oksbi,C932583850@ybl,DEV-MULE-HUB-77,125000.00
PAYSIM-1013,C1648232591@okhdfc,C932583850@ybl,DEV-MULE-HUB-77,118000.00
PAYSIM-1014,C1750905143@okicici,C932583850@ybl,DEV-MULE-HUB-77,142000.00
PAYSIM-1015,C1359044626@okaxis,C932583850@ybl,DEV-MULE-HUB-77,195000.00
PAYSIM-1016,scammer99@okicici,C476402209@oksbi,DEV-CLEAN-16,8900.00
```

**Expected Detection Outcome on Representative Dataset:**
* `PAYSIM-1003` & `PAYSIM-1016` $\rightarrow$ Flagged by **Bloom Filter + HashSet Verify** (blacklisted device `DEV-EMULATOR-9901` and VPA `scammer99@okicici`).
* `PAYSIM-1006` & `PAYSIM-1010` $\rightarrow$ Flagged by **Compressed Radix Tree** (`pmcares-relief` and `rbi-kyc` prefixes).
* `PAYSIM-1012` through `PAYSIM-1015` $\rightarrow$ Clustered by **Disjoint-Set Union** into a 6-node mule ring around `DEV:DEV-MULE-HUB-77` and flagged as 95th-percentile whale spikes by **Randomized Quickselect**.

---

## 7. Command Center UI Views & Screenshots

To capture screenshots for submission, save PNG captures inside `docs/screenshots/` corresponding to the views below:

| View / Tab | Screenshot Path | Key Visualized Functionality |
| :--- | :--- | :--- |
| **1. Command Overview** | `docs/screenshots/01-command-overview.png` | 4 real-time KPI cards, JVM algorithmic pipeline latency bars, detections breakdown by syllabus unit, and live flagged alert stream. |
| **2. Live UPI Checkout** | `docs/screenshots/02-live-upi-checkout.png` | Interactive UPI payment gateway simulator firing `POST /api/webhook/upi-auth` with instant `APPROVE` / `BLOCK_FRAUD` decision card and `0–100` risk gauge. |
| **3. Mule-Ring Graph (DSU)** | `docs/screenshots/03-mule-ring-dsu.png` | Connected component cluster cards isolating shared `DEV:...` hardware nodes and linked mule VPAs. |
| **4. Empirical Benchmarks** | `docs/screenshots/04-empirical-benchmarks.png` | Head-to-head Java timing table across $N = 1,000 \rightarrow 50,000$ demonstrating $>1,000\times$ Bloom Filter speedup and $3\times$–$5\times$ Quickselect speedup. |
| **5. Viva Edge & Stress Lab** | `docs/screenshots/05-stress-lab.png` | One-click adversarial presets testing empty arrays (`[]`), malformed/duplicate transactions, and coordinated multi-vector attacks. |
