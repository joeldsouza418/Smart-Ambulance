import { useState, useEffect, useRef } from "react";
import type { FC } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "triggered" | "tracking";
type VitalStatus = "ok" | "warn";

interface Vital {
    label: string;
    value: string;
    unit: string;
    status: VitalStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: string[] = ["Connecting", "Dispatching", "En Route", "Arrived", "At Hospital"];

const VITALS_MOCK: Vital[] = [
    { label: "Heart Rate", value: "94", unit: "bpm", status: "warn" },
    { label: "SpO2", value: "97", unit: "%", status: "ok" },
    { label: "BP", value: "118/76", unit: "mmHg", status: "ok" },
    { label: "Resp Rate", value: "22", unit: "/min", status: "warn" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PulseRingProps {
    active: boolean;
}
const PulseRing: FC<PulseRingProps> = ({ active }) => (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && ([0, 0.6, 1.2] as number[]).map((delay) => (
            <div
                key={delay}
                style={{
                    position: "absolute", width: 160, height: 160, borderRadius: "50%",
                    border: "2px solid #ff3b30",
                    animation: `pulse1 1.8s ease-out infinite ${delay}s`,
                    opacity: 0,
                }}
            />
        ))}
    </div>
);

// ─── Stage Tracker ────────────────────────────────────────────────────────────

interface StageTrackerProps {
    currentStage: number;
}
const StageTracker: FC<StageTrackerProps> = ({ currentStage }) => (
    <div style={{ padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
            {STAGES.map((stage, i) => {
                const done = i < currentStage;
                const active = i === currentStage;
                return (
                    <div key={stage} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: done ? "#ff3b30" : active ? "rgba(255,59,48,0.15)" : "rgba(255,255,255,0.06)",
                                border: `2px solid ${(done || active) ? "#ff3b30" : "rgba(255,255,255,0.12)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.5s ease",
                                boxShadow: active ? "0 0 12px rgba(255,59,48,0.5)" : "none",
                            }}>
                                {done
                                    ? <span style={{ color: "#fff", fontSize: 12 }}>✓</span>
                                    : active
                                        ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", animation: "blink 1s infinite" }} />
                                        : <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
                                }
                            </div>
                            <span style={{
                                fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 0.5,
                                color: active ? "#ff3b30" : done ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
                                textAlign: "center", whiteSpace: "nowrap", transition: "color 0.5s",
                            }}>
                                {stage}
                            </span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, margin: "0 2px", marginBottom: 22,
                                background: done ? "#ff3b30" : "rgba(255,255,255,0.08)",
                                transition: "background 0.5s ease",
                            }} />
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

// ─── ETA Card ─────────────────────────────────────────────────────────────────

interface ETACardProps {
    eta: number; // seconds
}
const ETACard: FC<ETACardProps> = ({ eta }) => {
    const [count, setCount] = useState<number>(eta);

    useEffect(() => {
        setCount(eta);
        const t = setInterval(() => setCount((c) => (c > 0 ? c - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [eta]);

    const mins = Math.floor(count / 60);
    const secs = count % 60;

    return (
        <div style={{
            background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)",
            borderRadius: 16, padding: "20px 24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
            <div>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 4 }}>
                    ETA
                </div>
                <div style={{ fontSize: 42, fontFamily: "'DM Mono', monospace", color: "#fff", fontWeight: 600, lineHeight: 1 }}>
                    {String(mins).padStart(2, "0")}
                    <span style={{ fontSize: 20, color: "rgba(255,255,255,0.4)", margin: "0 2px" }}>:</span>
                    {String(secs).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginTop: 2 }}>
                    MIN : SEC
                </div>
            </div>
            <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 6 }}>
                    UNIT
                </div>
                <div style={{ fontSize: 15, fontFamily: "'DM Mono', monospace", color: "#ff3b30", fontWeight: 600 }}>AMB-07</div>
                <div style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)", marginTop: 4 }}>2.4 km away</div>
            </div>
        </div>
    );
};

// ─── Vitals Grid ──────────────────────────────────────────────────────────────

const VitalsGrid: FC = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {VITALS_MOCK.map((v) => (
            <div key={v.label} style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${v.status === "warn" ? "rgba(255,159,10,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12, padding: "14px 16px",
            }}>
                <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 6 }}>
                    {v.label.toUpperCase()}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 22, fontFamily: "'DM Mono', monospace", color: v.status === "warn" ? "#ff9f0a" : "#fff", fontWeight: 600 }}>
                        {v.value}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.3)" }}>
                        {v.unit}
                    </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 1, color: v.status === "warn" ? "#ff9f0a" : "#30d158" }}>
                    {v.status === "warn" ? "⚠ ELEVATED" : "● NORMAL"}
                </div>
            </div>
        ))}
    </div>
);

// ─── Hospital Card ────────────────────────────────────────────────────────────

const HospitalCard: FC = () => (
    <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: "16px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
        <div>
            <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 5 }}>
                DESTINATION
            </div>
            <div style={{ fontSize: 15, fontFamily: "'DM Mono', monospace", color: "#fff", fontWeight: 600 }}>
                Lilavati Hospital
            </div>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
                ER ready · Trauma Level II
            </div>
        </div>
        <div style={{
            background: "rgba(48,209,88,0.12)", border: "1px solid rgba(48,209,88,0.3)",
            borderRadius: 8, padding: "6px 12px",
            fontSize: 10, fontFamily: "'DM Mono', monospace", color: "#30d158", letterSpacing: 1,
        }}>
            ER READY
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CallerApp: FC = () => {
    const [phase, setPhase] = useState<Phase>("idle");
    const [stage, setStage] = useState<number>(0);
    const [holdProgress, setHoldProgress] = useState<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startHold = (): void => {
        if (phase !== "idle") return;
        let p = 0;
        intervalRef.current = setInterval(() => {
            p += 4;
            setHoldProgress(p);
            if (p >= 100) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setHoldProgress(0);
                triggerSOS();
            }
        }, 60);
    };

    const endHold = (): void => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setHoldProgress(0);
    };

    const triggerSOS = (): void => {
        setPhase("triggered");
        setTimeout(() => setPhase("tracking"), 1200);
        let s = 0;
        const adv = setInterval(() => {
            s++;
            setStage(s);
            if (s >= STAGES.length - 1) clearInterval(adv);
        }, 4000);
    };

    return (
        <div style={{
            minHeight: "100vh", background: "#0a0a0a",
            fontFamily: "'DM Mono', monospace",
            display: "flex", justifyContent: "center", alignItems: "flex-start",
            padding: "0 0 40px",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes pulse1 {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        @keyframes blink   { 0%,100% { opacity: 1 } 50% { opacity: 0.2 } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>

            <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>

                {/* ── Header ── */}
                <div style={{ padding: "48px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 3, marginBottom: 6 }}>
                                SMART AMBULANCE
                            </div>
                            <div style={{ fontSize: 22, color: "#fff", fontWeight: 600, letterSpacing: -0.5 }}>
                                Emergency
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <div style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.25)",
                                borderRadius: 20, padding: "4px 10px",
                            }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#30d158", animation: "blink 2s infinite" }} />
                                <span style={{ fontSize: 9, color: "#30d158", letterSpacing: 2 }}>LIVE</span>
                            </div>
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>Mumbai, MH</span>
                        </div>
                    </div>
                </div>

                {/* ── Idle: SOS hold button ── */}
                {phase === "idle" && (
                    <div style={{ padding: "32px 24px 0", animation: "fadeUp 0.4s ease" }}>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textAlign: "center", marginBottom: 24 }}>
                            HOLD TO CALL EMERGENCY
                        </p>

                        <div style={{ display: "flex", justifyContent: "center", position: "relative", height: 220 }}>
                            <PulseRing active={false} />
                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                                {/* Progress ring */}
                                <svg width="160" height="160" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                                    <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,59,48,0.1)" strokeWidth="4" />
                                    <circle
                                        cx="80" cy="80" r="68" fill="none" stroke="#ff3b30" strokeWidth="4"
                                        strokeDasharray={`${2 * Math.PI * 68}`}
                                        strokeDashoffset={`${2 * Math.PI * 68 * (1 - holdProgress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: "stroke-dashoffset 0.06s linear" }}
                                    />
                                </svg>
                                <button
                                    onMouseDown={startHold}
                                    onMouseUp={endHold}
                                    onMouseLeave={endHold}
                                    onTouchStart={startHold}
                                    onTouchEnd={endHold}
                                    style={{
                                        width: 140, height: 140, borderRadius: "50%",
                                        position: "absolute", top: 10, left: 10,
                                        background: holdProgress > 0
                                            ? `radial-gradient(circle, rgba(231,76,60,${0.3 + holdProgress * 0.007}) 0%, rgba(192,57,43,${0.8 + holdProgress * 0.002}) 100%)`
                                            : "linear-gradient(145deg, #c0392b, #e74c3c)",
                                        border: "none", cursor: "pointer",
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                                        boxShadow: `0 0 ${20 + holdProgress * 0.4}px rgba(231,76,60,${0.3 + holdProgress * 0.005}), inset 0 2px 4px rgba(255,255,255,0.15)`,
                                        transition: "box-shadow 0.1s",
                                        userSelect: "none",
                                    }}
                                >
                                    <span style={{ fontSize: 28, color: "#fff" }}>🆘</span>
                                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", letterSpacing: 3 }}>SOS</span>
                                </button>
                            </div>
                        </div>

                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 1, textAlign: "center", marginTop: 8 }}>
                            Location will be shared automatically
                        </p>

                        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
                            {(["Type of emergency", "Number of people affected"] as string[]).map((placeholder) => (
                                <input
                                    key={placeholder}
                                    placeholder={placeholder}
                                    style={{
                                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                                        borderRadius: 12, padding: "14px 16px",
                                        color: "#fff", fontSize: 12, fontFamily: "'DM Mono', monospace",
                                        outline: "none", letterSpacing: 0.5, width: "100%", boxSizing: "border-box",
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Triggered: confirmation flash ── */}
                {phase === "triggered" && (
                    <div style={{ padding: "60px 24px", textAlign: "center", animation: "fadeUp 0.3s ease" }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: "50%",
                            background: "rgba(255,59,48,0.15)", border: "2px solid #ff3b30",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            margin: "0 auto 24px", fontSize: 32,
                        }}>
                            🚨
                        </div>
                        <div style={{ fontSize: 16, color: "#fff", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>
                            EMERGENCY SENT
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 2 }}>
                            FINDING NEAREST UNIT...
                        </div>
                    </div>
                )}

                {/* ── Tracking: live case view ── */}
                {phase === "tracking" && (
                    <div style={{ padding: "28px 24px", animation: "fadeUp 0.5s ease", display: "flex", flexDirection: "column", gap: 20 }}>

                        {/* Case ID + status badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 3 }}>CASE ID</div>
                                <div style={{ fontSize: 14, color: "#ff3b30", fontWeight: 600 }}>EMG-2024-0847</div>
                            </div>
                            <div style={{
                                background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)",
                                borderRadius: 8, padding: "6px 12px",
                                fontSize: 9, color: "#ff3b30", letterSpacing: 2,
                                animation: "blink 2s infinite",
                            }}>
                                ● ACTIVE
                            </div>
                        </div>

                        {/* Stage tracker */}
                        <div style={{
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 16, padding: "20px 16px",
                        }}>
                            <StageTracker currentStage={stage} />
                        </div>

                        <ETACard eta={480} />
                        <HospitalCard />

                        {/* Triage score */}
                        <div style={{
                            background: "rgba(255,159,10,0.06)", border: "1px solid rgba(255,159,10,0.2)",
                            borderRadius: 16, padding: "16px 20px",
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                            <div>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 5 }}>TRIAGE SCORE</div>
                                <div style={{ fontSize: 15, color: "#ff9f0a", fontWeight: 600 }}>MODERATE</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Score: 4 / 12 · NEWS2</div>
                            </div>
                            <div style={{
                                width: 48, height: 48, borderRadius: "50%",
                                background: "rgba(255,159,10,0.15)", border: "2px solid rgba(255,159,10,0.4)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 22, fontWeight: 700, color: "#ff9f0a", fontFamily: "'DM Mono', monospace",
                            }}>
                                4
                            </div>
                        </div>

                        {/* Live vitals */}
                        <div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 12 }}>
                                LIVE VITALS — STREAMING FROM AMBULANCE
                            </div>
                            <VitalsGrid />
                        </div>

                        {/* Cancel */}
                        <button style={{
                            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12, padding: "14px",
                            color: "rgba(255,255,255,0.3)", fontSize: 11,
                            fontFamily: "'DM Mono', monospace", cursor: "pointer", letterSpacing: 2,
                        }}>
                            CANCEL REQUEST
                        </button>

                    </div>
                )}
            </div>
        </div>
    );
};

export default CallerApp;