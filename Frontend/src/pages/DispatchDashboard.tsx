import { useState, useEffect , useCallback } from "react";
import type {FC} from "react";
// ─── Types ────────────────────────────────────────────────────────────────────

type AmbulanceStatus = "available" | "dispatched" | "returning";
type CasePriority = "critical" | "moderate" | "minor";
type MapTab = "fleet" | "cases" | "hospitals";

interface LatLng {
    lat: number;
    lng: number;
}

interface Ambulance {
    id: string;
    unit: string;
    status: AmbulanceStatus;
    driver: string;
    position: LatLng;
    speed: number;       // km/h
    eta?: number;        // seconds, only when dispatched
    caseId?: string;
}

interface EmergencyCase {
    id: string;
    caller: string;
    location: string;
    priority: CasePriority;
    triageScore: number;
    time: string;
    assignedUnit?: string;
    status: "pending" | "assigned" | "active";
}

interface Hospital {
    id: string;
    name: string;
    erStatus: "ready" | "busy" | "full";
    beds: number;
    distance: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_AMBULANCES: Ambulance[] = [
    { id: "a1", unit: "AMB-07", status: "dispatched", driver: "R. Sharma", position: { lat: 19.076, lng: 72.877 }, speed: 62, eta: 280, caseId: "EMG-0847" },
    { id: "a2", unit: "AMB-12", status: "available", driver: "P. Mehta", position: { lat: 19.082, lng: 72.865 }, speed: 0, },
    { id: "a3", unit: "AMB-03", status: "returning", driver: "S. Kulkarni", position: { lat: 19.068, lng: 72.883 }, speed: 38, },
    { id: "a4", unit: "AMB-19", status: "available", driver: "A. Patil", position: { lat: 19.091, lng: 72.871 }, speed: 0, },
    { id: "a5", unit: "AMB-05", status: "dispatched", driver: "M. Joshi", position: { lat: 19.073, lng: 72.891 }, speed: 55, eta: 510, caseId: "EMG-0841" },
];

const MOCK_CASES: EmergencyCase[] = [
    { id: "EMG-0847", caller: "Priya Nair", location: "Bandra West, Mumbai", priority: "critical", triageScore: 9, time: "2m ago", assignedUnit: "AMB-07", status: "active" },
    { id: "EMG-0848", caller: "Rohan Desai", location: "Andheri East, Mumbai", priority: "moderate", triageScore: 4, time: "5m ago", assignedUnit: undefined, status: "pending" },
    { id: "EMG-0841", caller: "Sunita Verma", location: "Kurla, Mumbai", priority: "critical", triageScore: 10, time: "12m ago", assignedUnit: "AMB-05", status: "active" },
    { id: "EMG-0849", caller: "Arjun Kapoor", location: "Dadar, Mumbai", priority: "minor", triageScore: 2, time: "18m ago", assignedUnit: undefined, status: "pending" },
    { id: "EMG-0839", caller: "Meena Pillai", location: "Worli, Mumbai", priority: "moderate", triageScore: 5, time: "31m ago", assignedUnit: "AMB-11", status: "assigned" },
];

const MOCK_HOSPITALS: Hospital[] = [
    { id: "h1", name: "Lilavati Hospital", erStatus: "ready", beds: 12, distance: "2.4 km" },
    { id: "h2", name: "Kokilaben Hospital", erStatus: "busy", beds: 4, distance: "4.1 km" },
    { id: "h3", name: "Hinduja Hospital", erStatus: "ready", beds: 8, distance: "5.7 km" },
    { id: "h4", name: "Breach Candy Hospital", erStatus: "full", beds: 0, distance: "6.2 km" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<AmbulanceStatus, string> = {
    available: "#30d158",
    dispatched: "#ff3b30",
    returning: "#ff9f0a",
};

const PRIORITY_COLOR: Record<CasePriority, string> = {
    critical: "#ff3b30",
    moderate: "#ff9f0a",
    minor: "#30d158",
};

const ER_COLOR: Record<Hospital["erStatus"], string> = {
    ready: "#30d158",
    busy: "#ff9f0a",
    full: "#ff3b30",
};

const fmtEta = (s: number): string =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ─── Map Placeholder ──────────────────────────────────────────────────────────

const MapPlaceholder: FC<{ ambulances: Ambulance[] }> = ({ ambulances }) => {
    // Fake dot positions spread across a 600x400 canvas representing Mumbai
    const toCanvas = (pos: LatLng): { x: number; y: number } => ({
        x: ((pos.lng - 72.855) / 0.055) * 580 + 20,
        y: ((19.1 - pos.lat) / 0.04) * 360 + 20,
    });

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", background: "#0d1117", borderRadius: 16, overflow: "hidden" }}>
            {/* Grid lines simulating map tiles */}
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
                <defs>
                    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                    </pattern>
                    <pattern id="grid2" width="180" height="180" patternUnits="userSpaceOnUse">
                        <path d="M 180 0 L 0 0 0 180" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <rect width="100%" height="100%" fill="url(#grid2)" />

                {/* Simulated roads */}
                <line x1="0" y1="40%" x2="100%" y2="38%" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <line x1="0" y1="62%" x2="100%" y2="64%" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
                <line x1="30%" y1="0" x2="32%" y2="100%" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <line x1="68%" y1="0" x2="66%" y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <line x1="0" y1="20%" x2="40%" y2="55%" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                <line x1="60%" y1="10%" x2="100%" y2="70%" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />

                {/* Water body (Arabian Sea) */}
                <ellipse cx="10%" cy="70%" rx="120" ry="200" fill="rgba(30,80,140,0.15)" />

                {/* Ambulance markers */}
                {ambulances.map((amb) => {
                    const { x, y } = toCanvas(amb.position);
                    const col = STATUS_COLOR[amb.status];
                    return (
                        <g key={amb.id}>
                            {amb.status === "dispatched" && (
                                <circle cx={`${(x / 620) * 100}%`} cy={`${(y / 420) * 100}%`} r="18" fill="none" stroke={col} strokeWidth="1" opacity="0.3">
                                    <animate attributeName="r" from="14" to="28" dur="2s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                                </circle>
                            )}
                            <circle
                                cx={`${(x / 620) * 100}%`}
                                cy={`${(y / 420) * 100}%`}
                                r="8" fill={col} opacity="0.9"
                            />
                            <circle
                                cx={`${(x / 620) * 100}%`}
                                cy={`${(y / 420) * 100}%`}
                                r="4" fill="#fff" opacity="0.9"
                            />
                            {/* Unit label */}
                            <text
                                x={`${(x / 620) * 100}%`}
                                y={`${((y + 18) / 420) * 100}%`}
                                textAnchor="middle"
                                fontSize="9"
                                fill={col}
                                fontFamily="'DM Mono', monospace"
                                fontWeight="600"
                            >
                                {amb.unit}
                            </text>
                        </g>
                    );
                })}

                {/* Dispatch HQ marker */}
                <circle cx="50%" cy="50%" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="50%" cy="50%" r="4" fill="rgba(255,255,255,0.6)" />
                <text x="50%" y="58%" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.4)" fontFamily="'DM Mono', monospace" dy="10">HQ</text>
            </svg>

            {/* Map attribution placeholder */}
            <div style={{
                position: "absolute", bottom: 10, right: 12,
                fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace"
            }}>
                REPLACE WITH GOOGLE MAPS — API KEY REQUIRED
            </div>

            {/* Legend */}
            <div style={{
                position: "absolute", top: 12, left: 12,
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "10px 14px",
                display: "flex", flexDirection: "column", gap: 6,
            }}>
                {(Object.entries(STATUS_COLOR) as [AmbulanceStatus, string][]).map(([s, c]) => (
                    <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace", textTransform: "capitalize" }}>{s}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}
const StatCard: FC<StatCardProps> = ({ label, value, sub, accent = "#fff" }) => (
    <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14, padding: "16px 18px", flex: 1,
    }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 8 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 600, color: accent, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{sub}</div>}
    </div>
);

// ─── Ambulance Row ────────────────────────────────────────────────────────────

const AmbulanceRow: FC<{ amb: Ambulance; selected: boolean; onClick: () => void }> = ({ amb, selected, onClick }) => (
    <div
        onClick={onClick}
        style={{
            padding: "14px 16px", borderRadius: 12, cursor: "pointer",
            background: selected ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${selected ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.2s",
        }}
    >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: STATUS_COLOR[amb.status],
                    boxShadow: `0 0 8px ${STATUS_COLOR[amb.status]}`,
                }} />
                <div>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{amb.unit}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{amb.driver}</div>
                </div>
            </div>
            <div style={{ textAlign: "right" }}>
                <div style={{
                    fontSize: 9, color: STATUS_COLOR[amb.status],
                    background: `${STATUS_COLOR[amb.status]}18`,
                    border: `1px solid ${STATUS_COLOR[amb.status]}40`,
                    borderRadius: 6, padding: "3px 8px", letterSpacing: 1,
                    fontFamily: "'DM Mono', monospace", textTransform: "uppercase",
                }}>
                    {amb.status}
                </div>
                {amb.speed > 0 && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{amb.speed} km/h</div>
                )}
            </div>
        </div>
        {amb.eta !== undefined && (
            <div style={{
                marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>ETA · {amb.caseId}</span>
                <span style={{ fontSize: 13, color: "#ff3b30", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{fmtEta(amb.eta)}</span>
            </div>
        )}
    </div>
);

// ─── Case Row ─────────────────────────────────────────────────────────────────

const CaseRow: FC<{ c: EmergencyCase }> = ({ c }) => (
    <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${PRIORITY_COLOR[c.priority]}`,
    }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>{c.id}</span>
                    <span style={{
                        fontSize: 8, color: PRIORITY_COLOR[c.priority],
                        background: `${PRIORITY_COLOR[c.priority]}18`,
                        border: `1px solid ${PRIORITY_COLOR[c.priority]}40`,
                        borderRadius: 4, padding: "2px 6px", letterSpacing: 1, textTransform: "uppercase",
                    }}>{c.priority}</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>{c.caller}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{c.location}</div>
            </div>
            <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, color: PRIORITY_COLOR[c.priority], fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{c.triageScore}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>NEWS2</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{c.time}</div>
            </div>
        </div>
        {c.assignedUnit && (
            <div style={{
                marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)",
                display: "flex", justifyContent: "space-between",
            }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Assigned</span>
                <span style={{ fontSize: 10, color: "#ff3b30", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{c.assignedUnit}</span>
            </div>
        )}
        {!c.assignedUnit && c.status === "pending" && (
            <button style={{
                marginTop: 10, width: "100%", padding: "8px",
                background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)",
                borderRadius: 8, color: "#ff3b30", fontSize: 10,
                fontFamily: "'DM Mono', monospace", cursor: "pointer", letterSpacing: 1,
            }}>
                ASSIGN UNIT
            </button>
        )}
    </div>
);

// ─── Hospital Row ─────────────────────────────────────────────────────────────

const HospitalRow: FC<{ h: Hospital }> = ({ h }) => (
    <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
        <div>
            <div style={{ fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{h.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{h.distance} · {h.beds} beds available</div>
        </div>
        <div style={{
            fontSize: 9, color: ER_COLOR[h.erStatus],
            background: `${ER_COLOR[h.erStatus]}18`,
            border: `1px solid ${ER_COLOR[h.erStatus]}40`,
            borderRadius: 6, padding: "4px 10px", letterSpacing: 1,
            fontFamily: "'DM Mono', monospace", textTransform: "uppercase",
        }}>
            {h.erStatus}
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DispatchDashboard: FC = () => {
    const [ambulances, setAmbulances] = useState<Ambulance[]>(MOCK_AMBULANCES);
    const [activeTab, setActiveTab] = useState<MapTab>("fleet");
    const [selectedUnit, setSelectedUnit] = useState<string | null>("a1");
    const [time, setTime] = useState<string>("");

    // Live clock
    useEffect(() => {
        const tick = (): void => setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    // Simulate ETA countdown
    useEffect(() => {
        const t = setInterval(() => {
            setAmbulances((prev) =>
                prev.map((a) =>
                    a.eta !== undefined && a.eta > 0
                        ? { ...a, eta: a.eta - 1 }
                        : a
                )
            );
        }, 1000);
        return () => clearInterval(t);
    }, []);

    const activeCount = ambulances.filter((a) => a.status === "dispatched").length;
    const availableCount = ambulances.filter((a) => a.status === "available").length;
    const pendingCases = MOCK_CASES.filter((c) => c.status === "pending").length;

    return (
        <div style={{
            minHeight: "100vh", background: "#080b10",
            fontFamily: "'DM Mono', monospace", color: "#fff",
            display: "flex", flexDirection: "column",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

            {/* ── Top bar ── */}
            <div style={{
                padding: "0 24px", height: 56,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.02)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", animation: "blink 1.5s infinite" }} />
                        <span style={{ fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>DISPATCH</span>
                    </div>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>MUMBAI CENTRAL</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    {pendingCases > 0 && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: "rgba(255,59,48,0.12)", border: "1px solid rgba(255,59,48,0.3)",
                            borderRadius: 20, padding: "4px 12px",
                            animation: "blink 2s infinite",
                        }}>
                            <span style={{ fontSize: 9, color: "#ff3b30", letterSpacing: 1 }}>
                                {pendingCases} PENDING
                            </span>
                        </div>
                    )}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{time}</span>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

                {/* ── Left sidebar ── */}
                <div style={{
                    width: 320, borderRight: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", flexDirection: "column", overflow: "hidden",
                    background: "rgba(255,255,255,0.01)",
                }}>
                    {/* Stat row */}
                    <div style={{ padding: "16px 16px 12px", display: "flex", gap: 10 }}>
                        <StatCard label="ACTIVE" value={activeCount} sub="units dispatched" accent="#ff3b30" />
                        <StatCard label="AVAILABLE" value={availableCount} sub="units standing by" accent="#30d158" />
                    </div>

                    {/* Tab switcher */}
                    <div style={{
                        display: "flex", margin: "0 16px 12px",
                        background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3,
                    }}>
                        {(["fleet", "cases", "hospitals"] as MapTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1, padding: "7px 0", borderRadius: 8, border: "none", cursor: "pointer",
                                    background: activeTab === tab ? "rgba(255,255,255,0.1)" : "transparent",
                                    color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.35)",
                                    fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 1,
                                    textTransform: "uppercase", transition: "all 0.2s",
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {activeTab === "fleet" && ambulances.map((amb) => (
                            <AmbulanceRow
                                key={amb.id}
                                amb={amb}
                                selected={selectedUnit === amb.id}
                                onClick={() => setSelectedUnit(amb.id === selectedUnit ? null : amb.id)}
                            />
                        ))}
                        {activeTab === "cases" && MOCK_CASES.map((c) => (
                            <CaseRow key={c.id} c={c} />
                        ))}
                        {activeTab === "hospitals" && MOCK_HOSPITALS.map((h) => (
                            <HospitalRow key={h.id} h={h} />
                        ))}
                    </div>
                </div>

                {/* ── Map area ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    {/* Map toolbar */}
                    <div style={{
                        padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                        <div style={{ display: "flex", gap: 16 }}>
                            {ambulances.map((a) => (
                                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[a.status] }} />
                                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{a.unit}</span>
                                    {a.eta !== undefined && (
                                        <span style={{ fontSize: 10, color: "#ff3b30", fontWeight: 600 }}>{fmtEta(a.eta)}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: 2 }}>
                            GPS UPDATE · 3s
                        </div>
                    </div>

                    {/* Map */}
                    <div style={{ flex: 1, padding: 16 }}>
                        <MapPlaceholder ambulances={ambulances} />
                    </div>

                    {/* Selected unit detail strip */}
                    {selectedUnit && (() => {
                        const amb = ambulances.find((a) => a.id === selectedUnit);
                        if (!amb) return null;
                        return (
                            <div style={{
                                padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)",
                                background: "rgba(255,255,255,0.02)",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                animation: "fadeUp 0.3s ease",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div>
                                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>SELECTED · </span>
                                        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{amb.unit}</span>
                                    </div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{amb.driver}</div>
                                    <div style={{ fontSize: 10, color: STATUS_COLOR[amb.status], textTransform: "uppercase" }}>{amb.status}</div>
                                    {amb.speed > 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{amb.speed} km/h</div>}
                                    {amb.caseId && <div style={{ fontSize: 10, color: "#ff3b30" }}>{amb.caseId}</div>}
                                </div>
                                {amb.eta !== undefined && (
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 2 }}>ETA</div>
                                        <div style={{ fontSize: 22, color: "#ff3b30", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtEta(amb.eta)}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default DispatchDashboard;