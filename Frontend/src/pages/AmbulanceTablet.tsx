import { useState, useEffect, useRef} from "react";
import type { FC } from "react";
// ─── Types ────────────────────────────────────────────────────────────────────

type TabletTab   = "nav" | "vitals" | "case";
type VitalKey    = "hr" | "spo2" | "rr" | "sbp" | "dbp" | "temp";
type VitalStatus = "ok" | "warn" | "critical";

interface VitalReading {
  key: VitalKey;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  warnMin: number;
  warnMax: number;
  step: number;
}

interface VitalHistoryPoint {
  t: number;
  value: number;
}

interface NavStep {
  instruction: string;
  distance: string;
  icon: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VITALS_CONFIG: VitalReading[] = [
  { key: "hr",   label: "Heart Rate",   value: 94,   unit: "bpm",  min: 20,  max: 200, normalMin: 60,   normalMax: 100, warnMin: 50,  warnMax: 120, step: 1   },
  { key: "spo2", label: "SpO2",         value: 97,   unit: "%",    min: 70,  max: 100, normalMin: 95,   normalMax: 100, warnMin: 90,  warnMax: 100, step: 1   },
  { key: "rr",   label: "Resp Rate",    value: 22,   unit: "/min", min: 4,   max: 40,  normalMin: 12,   normalMax: 20,  warnMin: 8,   warnMax: 25,  step: 1   },
  { key: "sbp",  label: "Systolic BP",  value: 118,  unit: "mmHg", min: 60,  max: 220, normalMin: 90,   normalMax: 140, warnMin: 80,  warnMax: 160, step: 2   },
  { key: "dbp",  label: "Diastolic BP", value: 76,   unit: "mmHg", min: 40,  max: 130, normalMin: 60,   normalMax: 90,  warnMin: 50,  warnMax: 100, step: 2   },
  { key: "temp", label: "Temperature",  value: 38.2, unit: "°C",   min: 34,  max: 42,  normalMin: 36.1, normalMax: 37.2,warnMin: 35,  warnMax: 39,  step: 0.1 },
];

const NAV_STEPS: NavStep[] = [
  { instruction: "Head north on SV Road",        distance: "0.3 km", icon: "↑" },
  { instruction: "Turn right onto Linking Road",  distance: "1.2 km", icon: "→" },
  { instruction: "Keep left at the fork",         distance: "0.8 km", icon: "↖" },
  { instruction: "Turn left onto Hill Road",      distance: "0.4 km", icon: "←" },
  { instruction: "Arrive at Lilavati Hospital",   distance: "0.0 km", icon: "⬤" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getVitalStatus = (v: VitalReading): VitalStatus => {
  if (v.value < v.warnMin || v.value > v.warnMax) return "critical";
  if (v.value < v.normalMin || v.value > v.normalMax) return "warn";
  return "ok";
};

const STATUS_COLOR: Record<VitalStatus, string> = {
  ok:       "#30d158",
  warn:     "#ff9f0a",
  critical: "#ff3b30",
};

const fmtEta = (s: number): string =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ─── Sparkline ────────────────────────────────────────────────────────────────

const Sparkline: FC<{ history: VitalHistoryPoint[]; color: string }> = ({ history, color }) => {
  if (history.length < 2) return null;
  const W = 80;
  const H = 28;
  const vals = history.map((p) => p.value);
  const mn = Math.min(...vals);
  const mx = Math.max(...vals) || mn + 1;
  const pts = history
    .map((p, i) => {
      const x = (i / (history.length - 1)) * W;
      const y = H - ((p.value - mn) / (mx - mn)) * H;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline
        points={pts} fill="none"
        stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8"
      />
    </svg>
  );
};

// ─── Vital Tile ───────────────────────────────────────────────────────────────

interface VitalTileProps {
  vital: VitalReading;
  history: VitalHistoryPoint[];
  onChange: (key: VitalKey, val: number) => void;
}

const VitalTile: FC<VitalTileProps> = ({ vital, history, onChange }) => {
  const status = getVitalStatus(vital);
  const col    = STATUS_COLOR[status];
  const pct    = ((vital.value - vital.min) / (vital.max - vital.min)) * 100;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${status === "ok" ? "rgba(255,255,255,0.08)" : col + "50"}`,
      borderRadius: 16, padding: "16px",
      display: "flex", flexDirection: "column", gap: 10,
      boxShadow: status !== "ok" ? `0 0 16px ${col}15` : "none",
      transition: "all 0.3s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 2 }}>
          {vital.label.toUpperCase()}
        </div>
        <div style={{
          fontSize: 8, color: col, background: col + "20",
          border: `1px solid ${col}40`, borderRadius: 4, padding: "2px 6px", letterSpacing: 1,
        }}>
          {status.toUpperCase()}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <span style={{ fontSize: 32, fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
            {vital.key === "temp" ? vital.value.toFixed(1) : vital.value}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{vital.unit}</span>
        </div>
        <Sparkline history={history} color={col} />
      </div>

      <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button
          onClick={() => onChange(vital.key, +(Math.max(vital.min, vital.value - vital.step)).toFixed(1))}
          style={{
            flex: 1, height: 36, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)", color: "#fff",
            fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >−</button>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>
          {vital.normalMin}–{vital.normalMax}
        </span>
        <button
          onClick={() => onChange(vital.key, +(Math.min(vital.max, vital.value + vital.step)).toFixed(1))}
          style={{
            flex: 1, height: 36, borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.06)", color: "#fff",
            fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
      </div>
    </div>
  );
};

// ─── Nav Map Placeholder ──────────────────────────────────────────────────────

const NavMap: FC<{ eta: number }> = ({ eta }) => (
  <div style={{
    flex: 1, background: "#0d1117", borderRadius: 16,
    overflow: "hidden", position: "relative", minHeight: 260,
  }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id="ng" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ng)"/>
      <path d="M 10% 90% L 10% 60% L 40% 60% L 40% 30% L 70% 30% L 70% 15% L 85% 15%"
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round"/>
      <path d="M 10% 90% L 10% 60% L 40% 60% L 40% 30% L 70% 30% L 70% 15% L 85% 15%"
        fill="none" stroke="#ff3b30" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 4"/>
      <circle cx="10%" cy="90%" r="10" fill="#ff3b30" opacity="0.9"/>
      <circle cx="10%" cy="90%" r="5"  fill="#fff"/>
      <circle cx="10%" cy="90%" r="18" fill="none" stroke="#ff3b30" strokeWidth="1" opacity="0.3">
        <animate attributeName="r"       from="10" to="24" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="85%" cy="15%" r="10" fill="#30d158" opacity="0.9"/>
      <circle cx="85%" cy="15%" r="5"  fill="#fff"/>
      <text x="85%" y="11%" textAnchor="middle" fontSize="9" fill="#30d158" fontFamily="'DM Mono', monospace">DEST</text>
    </svg>

    <div style={{
      position: "absolute", top: 14, right: 14,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
      padding: "10px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: 2, marginBottom: 3 }}>ETA</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
        {fmtEta(eta)}
      </div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>2.7 km left</div>
    </div>

    <div style={{
      position: "absolute", bottom: 10, right: 12,
      fontSize: 9, color: "rgba(255,255,255,0.15)", fontFamily: "'DM Mono', monospace",
    }}>
      REPLACE WITH GOOGLE MAPS
    </div>
  </div>
);

// ─── Turn Strip ───────────────────────────────────────────────────────────────

const TurnStrip: FC<{ steps: NavStep[]; current: number }> = ({ steps, current }) => {
  const cur  = steps[current];
  const next = steps[current + 1];
  return (
    <div style={{
      background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.25)",
      borderRadius: 14, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12, background: "#ff3b30",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0,
      }}>
        {cur.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 4 }}>{cur.instruction}</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>in {cur.distance}</div>
        {next && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 6 }}>
            Then: {next.icon} {next.instruction}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Case Info ────────────────────────────────────────────────────────────────

const CaseInfo: FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "20px",
    }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 12 }}>CASE DETAILS</div>
      {([
        ["Case ID",    "EMG-2024-0847"],
        ["Patient",    "Priya Nair, 34F"],
        ["Caller",     "Self"],
        ["Location",   "Bandra West, Mumbai"],
        ["Emergency",  "Chest pain, shortness of breath"],
        ["Triage",     "CRITICAL — Score 9/12"],
      ] as [string, string][]).map(([k, v]) => (
        <div key={k} style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: 10, paddingBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>{k}</span>
          <span style={{
            fontSize: 11, fontFamily: "'DM Mono', monospace",
            color: k === "Triage" ? "#ff3b30" : "#fff",
            fontWeight: k === "Triage" ? 600 : 400,
            maxWidth: "60%", textAlign: "right",
          }}>{v}</span>
        </div>
      ))}
    </div>

    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "20px",
    }}>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 12 }}>HOSPITAL</div>
      {([
        ["Destination", "Lilavati Hospital"],
        ["ER Status",   "READY"],
        ["Trauma Level","Level II"],
        ["ETA",         "08:14"],
      ] as [string, string][]).map(([k, v]) => (
        <div key={k} style={{
          display: "flex", justifyContent: "space-between",
          marginBottom: 10, paddingBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>{k}</span>
          <span style={{
            fontSize: 11, fontFamily: "'DM Mono', monospace",
            color: k === "ER Status" ? "#30d158" : k === "ETA" ? "#ff3b30" : "#fff",
          }}>{v}</span>
        </div>
      ))}
    </div>

    <button style={{
      padding: "16px", borderRadius: 14,
      background: "rgba(255,59,48,0.12)", border: "1px solid rgba(255,59,48,0.3)",
      color: "#ff3b30", fontSize: 12, fontFamily: "'DM Mono', monospace",
      cursor: "pointer", letterSpacing: 2, fontWeight: 600,
    }}>
      MARK PATIENT LOADED
    </button>
    <button style={{
      padding: "16px", borderRadius: 14,
      background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)",
      color: "#30d158", fontSize: 12, fontFamily: "'DM Mono', monospace",
      cursor: "pointer", letterSpacing: 2, fontWeight: 600,
    }}>
      MARK ARRIVED AT HOSPITAL
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AmbulanceTablet: FC = () => {
  const [tab, setTab]         = useState<TabletTab>("nav");
  const [vitals, setVitals]   = useState<VitalReading[]>(VITALS_CONFIG);
  const [eta, setEta]         = useState<number>(494);
  const [navStep, setNavStep] = useState<number>(0);
  const [speed]               = useState<number>(62);
  const [time, setTime]       = useState<string>("");

  const historyRef = useRef<Record<VitalKey, VitalHistoryPoint[]>>(
    Object.fromEntries(
      VITALS_CONFIG.map((v) => [v.key, [{ t: 0, value: v.value }]])
    ) as Record<VitalKey, VitalHistoryPoint[]>
  );

  useEffect(() => {
    const tick = (): void =>
      setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setEta((e) => (e > 0 ? e - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setVitals((prev) =>
        prev.map((v) => {
          const jitter = (Math.random() - 0.5) * v.step * 2;
          const next   = +(Math.min(v.max, Math.max(v.min, v.value + jitter))).toFixed(1);
          historyRef.current[v.key] = [
            ...historyRef.current[v.key].slice(-19),
            { t: Date.now(), value: next },
          ];
          return { ...v, value: next };
        })
      );
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const handleVitalChange = (key: VitalKey, val: number): void => {
    setVitals((prev) => prev.map((v) => (v.key === key ? { ...v, value: val } : v)));
    historyRef.current[key] = [
      ...historyRef.current[key].slice(-19),
      { t: Date.now(), value: val },
    ];
  };

  const criticalCount = vitals.filter((v) => getVitalStatus(v) === "critical").length;
  const warnCount     = vitals.filter((v) => getVitalStatus(v) === "warn").length;

  return (
    <div style={{
      minHeight: "100vh", background: "#080b10", color: "#fff",
      fontFamily: "'DM Mono', monospace", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button:active { opacity: 0.7; }
      `}</style>

      {/* Top bar */}
      <div style={{
        padding: "0 20px", height: 56,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.02)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", animation: "blink 1.5s infinite" }} />
            <span style={{ fontSize: 12, letterSpacing: 2, fontWeight: 600 }}>AMB-07</span>
          </div>
          <div style={{
            fontSize: 9, color: "#ff9f0a", background: "rgba(255,159,10,0.1)",
            border: "1px solid rgba(255,159,10,0.3)", borderRadius: 6, padding: "2px 8px", letterSpacing: 1,
          }}>
            EN ROUTE
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {criticalCount > 0 && (
            <div style={{
              fontSize: 9, color: "#ff3b30", background: "rgba(255,59,48,0.12)",
              border: "1px solid rgba(255,59,48,0.3)", borderRadius: 6,
              padding: "3px 8px", letterSpacing: 1, animation: "blink 1.5s infinite",
            }}>
              {criticalCount} CRITICAL
            </div>
          )}
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{speed} km/h</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{time}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", padding: "10px 20px", gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
      }}>
        {([
          { key: "nav",    label: "Navigation", badge: null },
          { key: "vitals", label: "Vitals",     badge: criticalCount + warnCount || null },
          { key: "case",   label: "Case Info",  badge: null },
        ] as { key: TabletTab; label: string; badge: number | null }[]).map(({ key, label, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
              background: tab === key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              color: tab === key ? "#fff" : "rgba(255,255,255,0.4)",
              fontSize: 11, fontFamily: "'DM Mono', monospace",
              letterSpacing: 1, position: "relative", transition: "all 0.2s",
            }}
          >
            {label}
            {badge && badge > 0 && (
              <span style={{
                position: "absolute", top: 6, right: 10,
                width: 16, height: 16, borderRadius: "50%",
                background: "#ff3b30", color: "#fff",
                fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", animation: "fadeUp 0.3s ease" }}>

        {/* NAV */}
        {tab === "nav" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
            <TurnStrip steps={NAV_STEPS} current={navStep} />
            <NavMap eta={eta} />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setNavStep((s) => Math.max(0, s - 1))}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", fontSize: 11,
                  fontFamily: "'DM Mono', monospace", cursor: "pointer",
                }}
              >← PREV STEP</button>
              <button
                onClick={() => setNavStep((s) => Math.min(NAV_STEPS.length - 1, s + 1))}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", fontSize: 11,
                  fontFamily: "'DM Mono', monospace", cursor: "pointer",
                }}
              >NEXT STEP →</button>
            </div>
          </div>
        )}

        {/* VITALS */}
        {tab === "vitals" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              display: "flex", gap: 10, padding: "12px 16px",
              background: "rgba(255,255,255,0.03)", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {([
                { label: "CRITICAL", count: criticalCount,                                  color: "#ff3b30" },
                { label: "WARNING",  count: warnCount,                                      color: "#ff9f0a" },
                { label: "NORMAL",   count: vitals.length - criticalCount - warnCount,      color: "#30d158" },
              ] as { label: string; count: number; color: string }[]).map(({ label, count, color }) => (
                <div key={label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'DM Mono', monospace" }}>{count}</div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{
              background: "rgba(255,159,10,0.06)", border: "1px solid rgba(255,159,10,0.2)",
              borderRadius: 14, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 2, marginBottom: 4 }}>
                  NEWS2 TRIAGE SCORE
                </div>
                <div style={{ fontSize: 14, color: "#ff9f0a", fontWeight: 600 }}>MODERATE — sending to hospital</div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(255,159,10,0.15)", border: "2px solid rgba(255,159,10,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 700, color: "#ff9f0a",
              }}>4</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {vitals.map((v) => (
                <VitalTile
                  key={v.key}
                  vital={v}
                  history={historyRef.current[v.key]}
                  onChange={handleVitalChange}
                />
              ))}
            </div>

            <button style={{
              padding: "16px", borderRadius: 14, marginTop: 4,
              background: "rgba(255,59,48,0.12)", border: "1px solid rgba(255,59,48,0.3)",
              color: "#ff3b30", fontSize: 12,
              fontFamily: "'DM Mono', monospace", cursor: "pointer", letterSpacing: 2, fontWeight: 600,
            }}>
              TRANSMIT VITALS TO HOSPITAL
            </button>
          </div>
        )}

        {/* CASE */}
        {tab === "case" && <CaseInfo />}
      </div>
    </div>
  );
};

export default AmbulanceTablet;