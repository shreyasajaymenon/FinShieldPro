import React, { useState, useEffect } from 'react';
import {
    ShieldAlert, Zap, Activity, Network, AlertTriangle, CheckCircle2,
    LayoutDashboard, Search, Database, Cpu, Terminal, PlusCircle, Upload,
    ArrowUpRight, Layers, RefreshCw, Sliders, Smartphone, ShieldCheck, Ban, KeyRound
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function App() {
    const [page, setPage] = useState('overview');
    const [batchSize, setBatchSize] = useState(500);
    const [dataSourceLabel, setDataSourceLabel] = useState('Synthetic Indian UPI Stream');
    const [result, setResult] = useState(null);
    const [engineStats, setEngineStats] = useState(null);
    const [benchmarks, setBenchmarks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [toast, setToast] = useState('');

    // Live Mobile UPI Gateway Simulator state
    const [gatewayTx, setGatewayTx] = useState({
        txId: 'UPI-2026-88412',
        senderVpa: 'shrey.patel@okicici',
        receiverVpa: 'pmcares-relief-2026@ybl',
        deviceId: 'ONEPLUS-12R-991',
        amountInr: 15000
    });
    const [gatewayVerdict, setGatewayVerdict] = useState(null);

    // Single Transaction Inspector state
    const [singleTx, setSingleTx] = useState({
        txId: 'TXN-LIVE-901',
        senderVpa: 'rahul.sharma@okicici',
        receiverVpa: 'rbi-kyc-help@ybl',
        deviceId: 'DEV-ANDROID-774',
        amountInr: 75000
    });

    // Threat Intel Injector state
    const [threatType, setThreatType] = useState('blacklist');
    const [threatValue, setThreatValue] = useState('');
    const [threatLabel, setThreatLabel] = useState('Custom Scam Pattern');

    // Custom JSON / Stress state
    const [customJson, setCustomJson] = useState('');
    const [alertFilter, setAlertFilter] = useState('ALL');

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 4000);
    };

    const fetchEngineStats = async () => {
        try {
            const res = await fetch(`${API_BASE}/stats`);
            if (res.ok) setEngineStats(await res.json());
        } catch { }
    };

    const runSampleScreen = async (size = batchSize) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/sample/${size}`);
            if (!res.ok) throw new Error('Backend unreachable');
            setResult(await res.json());
            setDataSourceLabel(`Synthetic Stream (${size.toLocaleString()} txns)`);
            await fetchEngineStats();
        } catch {
            setError('Java Spring Boot Engine offline at ' + API_BASE + '. Start backend with: mvn spring-boot:run');
        } finally {
            setLoading(false);
        }
    };

    const loadPaySimDataset = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/dataset/paysim`);
            if (!res.ok) throw new Error('PaySim load failed');
            setResult(await res.json());
            setDataSourceLabel('Real-World Kaggle PaySim Dataset (Mapped UPI Ledger)');
            await fetchEngineStats();
            showToast('Loaded & screened real-world PaySim mobile money dataset on JVM!');
        } catch {
            setError('Failed to load PaySim dataset from Java backend.');
        } finally {
            setLoading(false);
        }
    };

    const fireGatewayWebhook = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/webhook/upi-auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...gatewayTx, txId: 'UPI-' + Math.floor(100000 + Math.random() * 900000) }),
            });
            if (!res.ok) throw new Error('Webhook failed');
            setGatewayVerdict(await res.json());
        } catch {
            setError('Gateway webhook failed. Ensure Java backend is active.');
        } finally {
            setLoading(false);
        }
    };

    const runCustomPayload = async (payloadArray, successMsg) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/screen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadArray),
            });
            if (!res.ok) throw new Error('Screening failed');
            setResult(await res.json());
            setDataSourceLabel(`Custom Payload (${payloadArray.length} records)`);
            if (successMsg) showToast(successMsg);
        } catch {
            setError('Failed to execute payload on Java backend.');
        } finally {
            setLoading(false);
        }
    };

    const runBenchmarks = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/benchmark`);
            if (!res.ok) throw new Error('Benchmark failed');
            setBenchmarks(await res.json());
            showToast('Java scalability benchmarks completed across 3 input tiers.');
        } catch {
            setError('Could not run benchmarks. Ensure Java backend is active.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddThreat = async (e) => {
        e.preventDefault();
        if (!threatValue.trim()) return;
        try {
            const res = await fetch(`${API_BASE}/threat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: threatType, value: threatValue, label: threatLabel }),
            });
            if (!res.ok) throw new Error('Failed to add threat');
            setEngineStats(await res.json());
            showToast(`Injected "${threatValue}" into Java ${threatType === 'blacklist' ? 'Bloom Filter + HashSet' : 'Radix Tree'}!`);
            setThreatValue('');
        } catch {
            setError('Failed to update Java threat intelligence.');
        }
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const lines = String(evt.target?.result || '').split(/\r?\n/).filter(Boolean);
            const parsed = lines.slice(1).map((line, i) => {
                const [txId, senderVpa, receiverVpa, deviceId, amountInr] = line.split(',').map(s => s?.trim());
                return {
                    txId: txId || `CSV-${i + 1}`,
                    senderVpa: senderVpa || '',
                    receiverVpa: receiverVpa || '',
                    deviceId: deviceId || 'DEV-CSV',
                    amountInr: Number(amountInr) || 0
                };
            });
            runCustomPayload(parsed, `Screened ${parsed.length} rows from CSV via Java API.`);
            setPage('screener');
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        runSampleScreen(500);
    }, []);

    const navItems = [
        { id: 'overview', label: 'Command Overview', icon: LayoutDashboard, badge: 'LIVE' },
        { id: 'gateway', label: 'Live UPI Checkout', icon: Smartphone, badge: 'WEBHOOK' },
        { id: 'screener', label: 'Batch & CSV Inspector', icon: Search },
        { id: 'mulering', label: 'Mule-Ring Graph (DSU)', icon: Network, badge: result ? Object.keys(result.detectedMuleRings || {}).length : 0 },
        { id: 'intel', label: 'Threat Intel & Watchlist', icon: Database },
        { id: 'benchmark', label: 'Empirical Benchmarks', icon: Activity },
        { id: 'stress', label: 'Viva Edge & Stress Lab', icon: Terminal },
    ];

    const filteredAlerts = (result?.alerts || []).filter(a => {
        if (alertFilter === 'ALL') return true;
        return a.algorithmUsed.toLowerCase().includes(alertFilter.toLowerCase());
    });

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#070b14', color: '#e2e8f0', fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* LEFT SIDEBAR */}
            <aside style={{ width: '275px', background: '#0b1120', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', position: 'sticky', top: 0, height: '100vh' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 20px', borderBottom: '1px solid #1e293b' }}>
                        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', padding: '10px', borderRadius: '12px', boxShadow: '0 0 20px rgba(14,165,233,0.35)' }}>
                            <ShieldAlert size={24} color="#fff" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.02em', color: '#f8fafc' }}>FinShield <span style={{ color: '#38bdf8' }}>PRO</span></div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>REAL-TIME UPI SWITCH GUARD</div>
                        </div>
                    </div>

                    <nav style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const active = page === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setPage(item.id);
                                        if (item.id === 'benchmark' && benchmarks.length === 0) runBenchmarks();
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 13px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                        background: active ? 'linear-gradient(90deg, rgba(14,165,233,0.18), rgba(99,102,241,0.08))' : 'transparent',
                                        color: active ? '#38bdf8' : '#94a3b8',
                                        borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
                                        fontWeight: active ? 600 : 500, fontSize: '13.5px', textAlign: 'left'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Icon size={17} /> {item.label}
                                    </span>
                                    {item.badge !== undefined && (
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px',
                                            background: item.badge === 'LIVE' ? 'rgba(16,185,129,0.15)' : item.badge === 'WEBHOOK' ? 'rgba(168,85,247,0.18)' : '#1e293b',
                                            color: item.badge === 'LIVE' ? '#34d399' : item.badge === 'WEBHOOK' ? '#c084fc' : '#cbd5e1'
                                        }}>
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Engine Status Footer */}
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>JAVA CORE ENGINE</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: error ? '#f87171' : '#34d399', fontWeight: 600 }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: error ? '#ef4444' : '#10b981' }} />
                            {error ? 'OFFLINE' : 'CONNECTED'}
                        </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                        • Unit 2: Disjoint-Set Union<br />
                        • Unit 4: Compressed Radix Tree<br />
                        • Unit 6 (CO5): Bloom + Quickselect
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main style={{ flex: 1, padding: '28px 36px', maxWidth: '1400px', overflowY: 'auto' }}>
                {/* Top Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>
                            {navItems.find(n => n.id === page)?.label}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#38bdf8', fontWeight: 500 }}>
                            Active Dataset: {dataSourceLabel}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={loadPaySimDataset}
                            disabled={loading}
                            style={{
                                background: 'rgba(16,185,129,0.14)', border: '1px solid #10b981', color: '#34d399',
                                padding: '9px 14px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            <Database size={15} /> Load Real PaySim Dataset
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0f172a', padding: '7px 12px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                            <Sliders size={15} color="#38bdf8" />
                            <select
                                value={batchSize}
                                onChange={(e) => setBatchSize(Number(e.target.value))}
                                style={{ background: 'transparent', color: '#f8fafc', border: 'none', fontSize: '13px', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                            >
                                <option value={100} style={{ background: '#0f172a' }}>100 Txns</option>
                                <option value={500} style={{ background: '#0f172a' }}>500 Txns</option>
                                <option value={2500} style={{ background: '#0f172a' }}>2,500 Txns</option>
                                <option value={10000} style={{ background: '#0f172a' }}>10,000 Txns</option>
                            </select>
                            <button
                                onClick={() => runSampleScreen(batchSize)}
                                disabled={loading}
                                style={{
                                    background: 'linear-gradient(135deg, #0284c7, #2563eb)', color: '#fff', border: 'none',
                                    padding: '7px 14px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <RefreshCw size={14} /> {loading ? 'Running...' : 'Run Batch'}
                            </button>
                        </div>
                    </div>
                </div>

                {toast && (
                    <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', color: '#6ee7b7', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} /> {toast}
                    </div>
                )}

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444', color: '#fca5a5', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                {/* ==================== PAGE: LIVE UPI CHECKOUT WEBHOOK ==================== */}
                {page === 'gateway' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '28px', alignItems: 'start' }}>
                        {/* Simulated Mobile UPI App */}
                        <div style={{ background: '#0f172a', border: '2px solid #334155', borderRadius: '28px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                            <div style={{ textAlign: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '14px', marginBottom: '18px' }}>
                                <div style={{ width: '44px', height: '4px', background: '#334155', borderRadius: '99px', margin: '0 auto 12px' }} />
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.06em' }}>UPI PAYMENT GATEWAY SIMULATOR</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Fires real-time POST /api/webhook/upi-auth</div>
                            </div>

                            <form onSubmit={fireGatewayWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Payer UPI ID (Sender)</label>
                                    <input style={{ ...inputStyle, width: '100%' }} value={gatewayTx.senderVpa} onChange={e => setGatewayTx({ ...gatewayTx, senderVpa: e.target.value })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Payee UPI ID (Merchant / Receiver)</label>
                                    <input style={{ ...inputStyle, width: '100%' }} value={gatewayTx.receiverVpa} onChange={e => setGatewayTx({ ...gatewayTx, receiverVpa: e.target.value })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Device Fingerprint ID</label>
                                    <input style={{ ...inputStyle, width: '100%' }} value={gatewayTx.deviceId} onChange={e => setGatewayTx({ ...gatewayTx, deviceId: e.target.value })} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Transfer Amount (₹ INR)</label>
                                    <input style={{ ...inputStyle, width: '100%', fontSize: '18px', fontWeight: 800, color: '#34d399' }} type="number" value={gatewayTx.amountInr} onChange={e => setGatewayTx({ ...gatewayTx, amountInr: Number(e.target.value) })} />
                                </div>

                                {/* Quick Presets */}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    <button type="button" onClick={() => setGatewayTx({ ...gatewayTx, senderVpa: 'arjun@okicici', receiverVpa: 'zomato@paytm', deviceId: 'PIXEL-8', amountInr: 450 })} style={chipBtn}>Clean Payment</button>
                                    <button type="button" onClick={() => setGatewayTx({ ...gatewayTx, senderVpa: 'arjun@okicici', receiverVpa: 'pmcares-relief@ybl', deviceId: 'PIXEL-8', amountInr: 12000 })} style={chipBtn}>Phishing Handle</button>
                                    <button type="button" onClick={() => setGatewayTx({ ...gatewayTx, senderVpa: 'scammer99@okicici', receiverVpa: 'victim@oksbi', deviceId: 'DEV-ROOTED-8812', amountInr: 85000 })} style={chipBtn}>Blacklisted Fraud</button>
                                </div>

                                <button type="submit" style={{ marginTop: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '13px', borderRadius: '12px', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}>
                                    Pay ₹{gatewayTx.amountInr.toLocaleString('en-IN')} Now
                                </button>
                            </form>
                        </div>

                        {/* Real-Time Authorization Response Panel */}
                        <div style={cardStyle}>
                            <h3 style={cardTitleStyle}><Zap size={18} color="#38bdf8" /> Real-Time Switch Authorization Decision</h3>
                            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                                In production payment switches, every UPI intent must be scored in under 5 milliseconds before debiting the remitter bank.
                            </p>

                            {!gatewayVerdict ? (
                                <div style={{ padding: '48px 24px', textAlign: 'center', background: '#070b14', borderRadius: '12px', marginTop: '18px', color: '#64748b' }}>
                                    Click <b>Pay Now</b> on the UPI simulator to fire a live webhook into the Java Spring Boot engine.
                                </div>
                            ) : (
                                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{
                                        padding: '20px', borderRadius: '14px',
                                        background: gatewayVerdict.decision === 'BLOCK_FRAUD' ? 'rgba(239,68,68,0.14)' : gatewayVerdict.decision === 'STEP_UP_OTP' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)',
                                        border: `1px solid ${gatewayVerdict.decision === 'BLOCK_FRAUD' ? '#ef4444' : gatewayVerdict.decision === 'STEP_UP_OTP' ? '#f59e0b' : '#10b981'}`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            {gatewayVerdict.decision === 'BLOCK_FRAUD' ? <Ban size={36} color="#f87171" /> : gatewayVerdict.decision === 'STEP_UP_OTP' ? <KeyRound size={36} color="#fbbf24" /> : <ShieldCheck size={36} color="#34d399" />}
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>GATEWAY VERDICT ({gatewayVerdict.txId})</div>
                                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc' }}>{gatewayVerdict.decision}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>RISK SCORE</div>
                                            <div style={{ fontSize: '28px', fontWeight: 900, color: gatewayVerdict.riskScore >= 70 ? '#f87171' : '#34d399' }}>
                                                {gatewayVerdict.riskScore}/100
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#38bdf8' }}>JVM Latency: {gatewayVerdict.latencyMs} ms</div>
                                        </div>
                                    </div>

                                    <div style={{ background: '#070b14', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Decision Audit Trail:</div>
                                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#94a3b8', fontSize: '13px', lineHeight: 1.7 }}>
                                            {(gatewayVerdict.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
                                        </ul>
                                        {(gatewayVerdict.algorithmsTriggered || []).length > 0 && (
                                            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {gatewayVerdict.algorithmsTriggered.map((alg, i) => (
                                                    <span key={i} style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                                        {alg}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== PAGE 1: COMMAND OVERVIEW ==================== */}
                {page === 'overview' && result && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
                            <KpiCard title="Transactions Screened" value={result.validTransactions.toLocaleString('en-IN')} foot={`${result.invalidSkipped} malformed/duplicate rejected`} accent="#38bdf8" />
                            <KpiCard title="Bloom Filter Precheck (CO5)" value={`${result.bloomNegativeInstantPasses.toLocaleString('en-IN')} Passed`} foot={`${result.bloomTruePositives} Confirmed Hits • ${result.bloomFalsePositivesCaught} FP Caught`} accent="#34d399" />
                            <KpiCard title="95th Percentile Cutoff" value={`₹${result.percentile95ThresholdInr.toLocaleString('en-IN')}`} foot="Computed in O(n) via Randomized Quickselect" accent="#a78bfa" />
                            <KpiCard title="Active Fraud Alerts" value={result.alerts.length.toLocaleString('en-IN')} foot={`${Object.keys(result.detectedMuleRings || {}).length} DSU Mule Rings isolated`} accent="#f43f5e" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                            <div style={cardStyle}>
                                <h3 style={cardTitleStyle}><Cpu size={17} color="#38bdf8" /> JVM Algorithmic Pipeline Latency (ms)</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                                    {[
                                        { label: 'Stage 1: Bloom Filter + HashSet Verify (CO5)', ms: result.stageLatencyMs?.bloomFilterMs || 0, color: '#38bdf8' },
                                        { label: 'Stage 2: Compressed Radix Tree Scan (Unit 4)', ms: result.stageLatencyMs?.radixTreeMs || 0, color: '#818cf8' },
                                        { label: 'Stage 3: Disjoint-Set Union Clustering (Unit 2)', ms: result.stageLatencyMs?.dsuClusteringMs || 0, color: '#f43f5e' },
                                        { label: 'Stage 4: Randomized Quickselect P95 (CO5)', ms: result.stageLatencyMs?.randomizedQuickselectMs || 0, color: '#34d399' },
                                    ].map((s, idx) => {
                                        const maxMs = Math.max(...Object.values(result.stageLatencyMs || { a: 1 }), 0.5);
                                        const pct = Math.min(100, Math.max(6, (s.ms / maxMs) * 100));
                                        return (
                                            <div key={idx}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '5px' }}>
                                                    <span style={{ color: '#cbd5e1' }}>{s.label}</span>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: s.color }}>{s.ms} ms</span>
                                                </div>
                                                <div style={{ height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: '999px' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={cardStyle}>
                                <h3 style={cardTitleStyle}><Layers size={17} color="#a78bfa" /> Detections by Syllabus Algorithm</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                                    {[
                                        { name: 'Bloom Filter (CO5)', key: 'Bloom', desc: 'Blacklisted VPA/Device' },
                                        { name: 'Radix Tree (Unit 4)', key: 'Radix', desc: 'Phishing Prefix Match' },
                                        { name: 'DSU Clustering (Unit 2)', key: 'Disjoint-Set', desc: 'Shared-Device Mule Ring' },
                                        { name: 'Quickselect (CO5)', key: 'Quickselect', desc: '95th %ile Whale Spike' },
                                    ].map(item => {
                                        const count = result.alerts.filter(a => a.algorithmUsed.includes(item.key)).length;
                                        return (
                                            <div key={item.key} style={{ background: '#070b14', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>{count}</div>
                                                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>{item.name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.desc}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={cardTitleStyle}><ShieldAlert size={17} color="#f43f5e" /> Live Flagged Fraud Stream</h3>
                                <button onClick={() => setPage('screener')} style={{ background: 'transparent', border: '1px solid #334155', color: '#38bdf8', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Inspect All & Filter <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <AlertTable alerts={result.alerts.slice(0, 10)} />
                        </div>
                    </div>
                )}

                {/* ==================== PAGE 2: BATCH & CSV INSPECTOR ==================== */}
                {page === 'screener' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
                            <div style={cardStyle}>
                                <h3 style={cardTitleStyle}><Search size={17} color="#38bdf8" /> Single UPI Transaction Deep Inspector</h3>
                                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 14px' }}>
                                    Test any custom VPA handle, device ID, or amount directly against all 4 Java algorithms.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <input style={inputStyle} placeholder="Sender VPA" value={singleTx.senderVpa} onChange={e => setSingleTx({ ...singleTx, senderVpa: e.target.value })} />
                                    <input style={inputStyle} placeholder="Receiver VPA" value={singleTx.receiverVpa} onChange={e => setSingleTx({ ...singleTx, receiverVpa: e.target.value })} />
                                    <input style={inputStyle} placeholder="Device ID" value={singleTx.deviceId} onChange={e => setSingleTx({ ...singleTx, deviceId: e.target.value })} />
                                    <input style={inputStyle} type="number" placeholder="Amount (INR)" value={singleTx.amountInr} onChange={e => setSingleTx({ ...singleTx, amountInr: Number(e.target.value) })} />
                                </div>
                                <button
                                    onClick={() => runCustomPayload([singleTx], 'Single transaction evaluated by Java Spring Boot engine.')}
                                    style={{ marginTop: '12px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                                >
                                    Screen Single Transaction
                                </button>
                            </div>

                            <div style={cardStyle}>
                                <h3 style={cardTitleStyle}><Upload size={17} color="#34d399" /> Upload CSV Transaction Ledger</h3>
                                <p style={{ fontSize: '12.5px', color: '#64748b', margin: '4px 0 14px' }}>
                                    Upload a CSV with columns: <code>txId,senderVpa,receiverVpa,deviceId,amountInr</code>
                                </p>
                                <label style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    border: '1px dashed #334155', borderRadius: '10px', padding: '24px', cursor: 'pointer', background: '#070b14'
                                }}>
                                    <Upload size={24} color="#38bdf8" />
                                    <span style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px' }}>Click to Select CSV File</span>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>Parsed locally & screened on Java server</span>
                                    <input type="file" accept=".csv" onChange={handleCsvUpload} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        {result && (
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                    <h3 style={cardTitleStyle}>Screened Alert Log ({filteredAlerts.length} matching alerts)</h3>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {['ALL', 'Bloom', 'Radix', 'Disjoint-Set', 'Quickselect'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setAlertFilter(f)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155', fontSize: '12px', cursor: 'pointer',
                                                    background: alertFilter === f ? '#0284c7' : '#070b14', color: '#fff', fontWeight: 600
                                                }}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <AlertTable alerts={filteredAlerts.slice(0, 100)} />
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== PAGE 3: MULE-RING GRAPH EXPLORER (DSU) ==================== */}
                {page === 'mulering' && result && (
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}><Network size={18} color="#f43f5e" /> Disjoint-Set Union (Unit 2) — Connected Mule-Account Clusters</h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                            Using <b>Union by Rank + Path Compression</b> ($O(\alpha(n))$ amortized), FinShield merges VPAs and Device IDs into connected components. Any component with $\ge 4$ linked entities is flagged as an organized mule ring.
                        </p>

                        {Object.keys(result.detectedMuleRings || {}).length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#070b14', borderRadius: '10px', marginTop: '16px' }}>
                                No multi-account mule rings detected in this batch. Click <b>Load Real PaySim Dataset</b> or run a 500+ txn batch.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginTop: '18px' }}>
                                {Object.entries(result.detectedMuleRings).map(([root, members], idx) => (
                                    <div key={root} style={{ background: '#070b14', border: '1px solid #be123c', borderRadius: '12px', padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <span style={{ fontWeight: 700, color: '#fda4af', fontSize: '14px' }}>Mule Cluster #{idx + 1}</span>
                                            <span style={{ background: '#881337', color: '#fecdd3', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                                                {members.length} Linked Nodes
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                                            DSU Canonical Root: <code style={{ color: '#38bdf8' }}>{root}</code>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {members.map(node => (
                                                <span key={node} style={{
                                                    fontSize: '11.5px', padding: '4px 9px', borderRadius: '6px', fontFamily: 'monospace',
                                                    background: node.startsWith('DEV:') ? 'rgba(244,63,94,0.2)' : '#1e293b',
                                                    color: node.startsWith('DEV:') ? '#fda4af' : '#e2e8f0',
                                                    border: node.startsWith('DEV:') ? '1px solid #f43f5e' : '1px solid #334155'
                                                }}>
                                                    {node}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== PAGE 4: THREAT INTEL & WATCHLIST MANAGER ==================== */}
                {page === 'intel' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                        <div style={cardStyle}>
                            <h3 style={cardTitleStyle}><PlusCircle size={18} color="#38bdf8" /> Live Watchlist & Prefix Injector</h3>
                            <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '6px 0 16px' }}>
                                Dynamically insert new fraud indicators directly into the running Java data structures.
                            </p>
                            <form onSubmit={handleAddThreat} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={labelStyle}>Target Java Data Structure</label>
                                <select value={threatType} onChange={e => setThreatType(e.target.value)} style={inputStyle}>
                                    <option value="blacklist">Bloom Filter + Authoritative HashSet (Exact VPA / Device)</option>
                                    <option value="prefix">Compressed Radix Tree (Scam VPA Prefix)</option>
                                </select>

                                <label style={labelStyle}>
                                    {threatType === 'blacklist' ? 'Blacklisted VPA or Device ID' : 'Phishing Prefix Pattern'}
                                </label>
                                <input
                                    style={inputStyle}
                                    placeholder={threatType === 'blacklist' ? 'e.g. fraudster2026@okaxis' : 'e.g. modi-yojana-free'}
                                    value={threatValue}
                                    onChange={e => setThreatValue(e.target.value)}
                                />

                                {threatType === 'prefix' && (
                                    <>
                                        <label style={labelStyle}>Threat Classification Label</label>
                                        <input style={inputStyle} value={threatLabel} onChange={e => setThreatLabel(e.target.value)} />
                                    </>
                                )}

                                <button type="submit" style={{ background: '#10b981', color: '#064e3b', fontWeight: 700, border: 'none', padding: '11px', borderRadius: '8px', cursor: 'pointer', marginTop: '4px' }}>
                                    Insert into Java Memory Structure
                                </button>
                            </form>
                        </div>

                        <div style={cardStyle}>
                            <h3 style={cardTitleStyle}><Database size={18} color="#a78bfa" /> Live JVM Data Structure Telemetry</h3>
                            {engineStats ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ background: '#070b14', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>BLOOM BIT-ARRAY SIZE (m)</div>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#38bdf8' }}>{engineStats.bloomBitArraySize?.toLocaleString()} bits</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Optimal k = {engineStats.bloomHashFunctions} hash functions</div>
                                        </div>
                                        <div style={{ background: '#070b14', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>EMPIRICAL FALSE POSITIVE RATE</div>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>{(engineStats.bloomEstimatedFpRate * 100).toFixed(3)}%</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{engineStats.authoritativeBlacklistCount?.toLocaleString()} indexed entities</div>
                                        </div>
                                    </div>

                                    <div style={{ background: '#070b14', padding: '14px', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Active Radix Tree Scam Prefixes</span>
                                            <span style={{ fontSize: '11px', color: '#a78bfa' }}>Compressed Nodes: {engineStats.radixCompressedNodes}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {(engineStats.activePhishingPrefixes || []).map(p => (
                                                <span key={p} style={{ background: '#1e293b', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                                                    {p}*
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: '#64748b', fontSize: '13px' }}>Connect Java backend to inspect live bit-array and Radix tree metrics.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* ==================== PAGE 5: EMPIRICAL BENCHMARK LAB ==================== */}
                {page === 'benchmark' && (
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <div>
                                <h3 style={cardTitleStyle}><Activity size={18} color="#38bdf8" /> Scalability & Baseline Comparison (Rubric: 15 Marks)</h3>
                                <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0' }}>
                                    Live execution comparison in Java across 3 scaled input tiers ($N = 1,000 \rightarrow 50,000$ transactions).
                                </p>
                            </div>
                            <button onClick={runBenchmarks} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                Re-run Java Benchmark
                            </button>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                                    <th style={{ padding: '12px' }}>Batch Size (N)</th>
                                    <th style={{ padding: '12px' }}>Bloom Filter + Verify (CO5)</th>
                                    <th style={{ padding: '12px' }}>Naive Linear List Scan</th>
                                    <th style={{ padding: '12px' }}>Bloom Speedup</th>
                                    <th style={{ padding: '12px' }}>Randomized Quickselect (CO5)</th>
                                    <th style={{ padding: '12px' }}>Full Arrays.sort() Baseline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {benchmarks.map(b => {
                                    const speedup = b.bloomFilterMs > 0 ? (b.linearBaselineMs / b.bloomFilterMs).toFixed(1) : '∞';
                                    return (
                                        <tr key={b.inputSize} style={{ borderBottom: '1px solid #1e293b' }}>
                                            <td style={{ padding: '12px', fontWeight: 700 }}>{b.inputSize.toLocaleString()} txns</td>
                                            <td style={{ padding: '12px', color: '#34d399', fontWeight: 700 }}>{b.bloomFilterMs} ms</td>
                                            <td style={{ padding: '12px', color: '#f87171' }}>{b.linearBaselineMs} ms</td>
                                            <td style={{ padding: '12px' }}><span style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>{speedup}x faster</span></td>
                                            <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 700 }}>{b.quickselectMs} ms</td>
                                            <td style={{ padding: '12px', color: '#f87171' }}>{b.fullSortBaselineMs} ms</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ==================== PAGE 6: VIVA EDGE & STRESS LAB ==================== */}
                {page === 'stress' && (
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}><Terminal size={18} color="#38bdf8" /> Viva Edge-Case & Adversarial Input Simulator</h3>
                        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
                            Demonstrate fault-tolerance during your 8-minute live demo by firing invalid, empty, duplicate, or coordinated attack payloads into the Java API.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', margin: '18px 0' }}>
                            <button
                                onClick={() => { runCustomPayload([], 'Empty array [] handled cleanly with zero exceptions.'); setPage('overview'); }}
                                style={presetBtnStyle('#334155')}
                            >
                                1. Empty Dataset ([])
                            </button>
                            <button
                                onClick={() => {
                                    runCustomPayload([
                                        { txId: 'BAD-1', senderVpa: 'missing-at-sign', receiverVpa: 'shop@upi', deviceId: 'D1', amountInr: 500 },
                                        { txId: 'BAD-2', senderVpa: 'a@upi', receiverVpa: 'b@upi', deviceId: 'D2', amountInr: -5000 },
                                        { txId: 'DUP-1', senderVpa: 'a@upi', receiverVpa: 'b@upi', deviceId: 'D2', amountInr: 400 },
                                        { txId: 'DUP-1', senderVpa: 'a@upi', receiverVpa: 'b@upi', deviceId: 'D2', amountInr: 400 }
                                    ], 'Rejected 4 malformed/negative/duplicate transactions gracefully.');
                                    setPage('overview');
                                }}
                                style={presetBtnStyle('#b45309')}
                            >
                                2. Malformed & Duplicate Txns
                            </button>
                            <button
                                onClick={() => {
                                    runCustomPayload([
                                        { txId: 'M1', senderVpa: 'mule_alpha@okicici', receiverVpa: 'kingpin@paytm', deviceId: 'ROOTED-X9', amountInr: 45000 },
                                        { txId: 'M2', senderVpa: 'mule_beta@okicici', receiverVpa: 'kingpin@paytm', deviceId: 'ROOTED-X9', amountInr: 48000 },
                                        { txId: 'M3', senderVpa: 'mule_gamma@okicici', receiverVpa: 'kingpin@paytm', deviceId: 'ROOTED-X9', amountInr: 49000 },
                                        { txId: 'M4', senderVpa: 'mule_delta@okicici', receiverVpa: 'pmcares-relief@ybl', deviceId: 'ROOTED-X9', amountInr: 195000 }
                                    ], 'Triggered DSU Mule Ring + Radix Phishing + Quickselect Whale Spike!');
                                    setPage('mulering');
                                }}
                                style={presetBtnStyle('#be123c')}
                            >
                                3. Coordinated Mule + Phishing Attack
                            </button>
                        </div>

                        <textarea
                            rows={7}
                            placeholder='Paste custom JSON array e.g. [{"txId":"T1","senderVpa":"a@okicici","receiverVpa":"rbi-kyc@ybl","deviceId":"D1","amountInr":99000}]'
                            value={customJson}
                            onChange={(e) => setCustomJson(e.target.value)}
                            style={{ width: '100%', background: '#070b14', color: '#38bdf8', padding: '14px', borderRadius: '10px', border: '1px solid #334155', fontFamily: 'monospace', fontSize: '13px' }}
                        />
                        <button
                            onClick={() => {
                                try {
                                    runCustomPayload(JSON.parse(customJson), 'Custom JSON payload screened successfully.');
                                    setPage('overview');
                                } catch {
                                    setError('Invalid JSON syntax in editor.');
                                }
                            }}
                            style={{ marginTop: '12px', background: '#0284c7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Execute Custom JSON on Java Server
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

function AlertTable({ alerts }) {
    if (!alerts || alerts.length === 0) {
        return <div style={{ padding: '20px', color: '#64748b', fontSize: '13px' }}>No fraud alerts triggered for this filter.</div>;
    }
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b' }}>
                        <th style={{ padding: '10px' }}>TX ID</th>
                        <th style={{ padding: '10px' }}>SENDER → RECEIVER</th>
                        <th style={{ padding: '10px' }}>AMOUNT</th>
                        <th style={{ padding: '10px' }}>THREAT REASON</th>
                        <th style={{ padding: '10px' }}>JAVA ALGORITHM</th>
                    </tr>
                </thead>
                <tbody>
                    {alerts.map((a, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                            <td style={{ padding: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{a.txId}</td>
                            <td style={{ padding: '10px' }}>{a.senderVpa} → <b style={{ color: '#f8fafc' }}>{a.receiverVpa}</b></td>
                            <td style={{ padding: '10px', fontWeight: 700, color: '#e2e8f0' }}>₹{a.amountInr.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '10px', color: '#fda4af' }}>{a.reason}</td>
                            <td style={{ padding: '10px' }}>
                                <span style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)', padding: '3px 9px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600 }}>
                                    {a.algorithmUsed}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function KpiCard({ title, value, foot, accent }) {
    return (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '18px', borderTop: `3px solid ${accent}` }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', margin: '8px 0 4px' }}>{value}</div>
            <div style={{ fontSize: '11.5px', color: accent }}>{foot}</div>
        </div>
    );
}

const cardStyle = {
    background: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '20px'
};
const cardTitleStyle = {
    margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px'
};
const labelStyle = {
    display: 'block', fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px'
};
const inputStyle = {
    background: '#070b14', border: '1px solid #334155', color: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none'
};
const chipBtn = {
    background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '5px 9px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer'
};
const presetBtnStyle = (bg) => ({
    background: bg, color: '#fff', border: 'none', padding: '12px 14px', borderRadius: '9px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textAlign: 'left'
});