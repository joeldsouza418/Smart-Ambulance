import { useState, useEffect } from "react";
import type { FC } from "react";
// ─── Types ────────────────────────────────────────────────────────────────────

type ERStatus = "incoming" | "arrived" | "in_treatment" | "transferred";
type Priority = "critical" | "high" | "moderate" | "minor";
type BedStatus = "available" | "occupied" | "reserved";
type VitalStatus = "ok" | "warn" | "critical";

interface IncomingPatient {
    id: string;
    caseId: string;
    name: string;
    age: number;
    gender: "M" | "F";
    chiefComplaint: string;
    priority: Priority;
    triageScore: number;
    unit: string;
    eta: number;          // seconds
    status: ERStatus;
    assignedBed?: string;
    vitals: {
        hr: number;
        spo2: number;
        sbp: number;
        dbp: number;
        rr: number;
        temp: number;
    };
    erPrep: string[];     // prep instructions
    arrivalTime?: string;
}

interface ERBed {
    id: string;
    label: string;
    status: BedStatus;
    patientId?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
    critical: "#ff3b30",
    high: "#ff6b35",
    moderate: "#ff9f0a",
    minor: "#30d158",
};

const PRIORITY_BG: Record<Priority, string> = {
    critical: "rgba(255,59,48,0.1)",
    high: "rgba(255,107,53,0.1)",
    moderate: "rgba(255,159,10,0.1)",
    minor: "rgba(48,209,88,0.08)",
};

const STATUS_LABEL: Record<ERStatus, string> = {
    incoming: "EN ROUTE",
    arrived: "ARRIVED",
    in_treatment: "IN TREATMENT",
    transferred: "TRANSFERRED",
};

const STATUS_COLOR: Record<ERStatus, string> = {
    incoming: "#ff9f0a",
    arrived: "#30d158",
    in_treatment: "#0a84ff",
    transferred: "rgba(255,255,255,0.3)",
};

const fmtEta = (s: number): string =>
    s <= 0
        ? "NOW"
        : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const getVitalStatus = (key: string, val: number): VitalStatus => {
    const ranges: Record<string, [number, number, number, number]> = {
        hr: [50, 120, 40, 150],
        spo2: [95, 100, 90, 100],
        sbp: [90, 140, 80, 180],
        rr: [12, 20, 8, 30],
        temp: [36.1, 37.5, 35, 39.5],
    };
    const r = ranges[key];
    if (!r) return "ok";
    const [nMin, nMax, wMin, wMax] = r;
    if (val < wMin || val > wMax) return "critical";
    if (val < nMin || val > nMax) return "warn";
    return "ok";
};

const VITAL_COLOR: Record<VitalStatus, string> = {
    ok: "#30d158",
    warn: "#ff9f0a",
    critical: "#ff3b30",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PATIENTS: IncomingPatient[] = [
    {
        id: "p1", caseId: "EMG-2024-0847",
        name: "Priya Nair", age: 34, gender: "F",
        chiefComplaint: "Chest pain, shortness of breath",
        priority: "critical", triageScore: 9,
        unit: "AMB-07", eta: 314, status: "incoming",
        assignedBed: "T1",
        vitals: { hr: 118, spo2: 93, sbp: 88, dbp: 60, rr: 26, temp: 37.1 },
        erPrep: [
            "Activate cardiac team",
            "Prepare 12-lead ECG",
            "IV access × 2, draw cardiac enzymes",
            "Oxygen therapy ready",
            "Defibrillator on standby",
        ],
    },
    {
        id: "p2", caseId: "EMG-2024-0841",
        name: "Rajan Pillai", age: 58, gender: "M",
        chiefComplaint: "Head trauma, loss of consciousness",
        priority: "critical", triageScore: 10,
        unit: "AMB-05", eta: 0, status: "arrived",
        assignedBed: "T2",
        vitals: { hr: 54, spo2: 91, sbp: 160, dbp: 100, rr: 10, temp: 36.8 },
        erPrep: [
            "Neurosurgery consult stat",
            "CT head immediately on arrival",
            "C-spine precautions",
            "GCS monitoring every 5 min",
        ],
        arrivalTime: "14:32",
    },
    {
        id: "p3", caseId: "EMG-2024-0839",
        name: "Sunita Mehta", age: 42, gender: "F",
        chiefComplaint: "Severe abdominal pain, vomiting",
        priority: "moderate", triageScore: 5,
        unit: "AMB-11", eta: 0, status: "in_treatment",
        assignedBed: "B3",
        vitals: { hr: 96, spo2: 98, sbp: 110, dbp: 72, rr: 18, temp: 38.6 },
        erPrep: [
            "Surgical consult requested",
            "NPO — nil by mouth",
            "IV fluids running",
            "Ultrasound abdomen ordered",
        ],
        arrivalTime: "14:08",
    },
    {
        id: "p4", caseId: "EMG-2024-0848",
        name: "Arjun Desai", age: 22, gender: "M",
        chiefComplaint: "Laceration, right forearm",
        priority: "minor", triageScore: 2,
        unit: "AMB-09", eta: 720, status: "incoming",
        vitals: { hr: 82, spo2: 99, sbp: 122, dbp: 78, rr: 16, temp: 37.0 },
        erPrep: [
            "Wound irrigation kit ready",
            "Suture tray prep",
            "Tetanus check",
        ],
    },
];

const ER_BEDS: ERBed[] = [
    { id: "T1", label: "Trauma 1", status: "reserved", patientId: "p1" },
    { id: "T2", label: "Trauma 2", status: "occupied", patientId: "p2" },
    { id: "T3", label: "Trauma 3", status: "available" },
    { id: "B1", label: "Bay 1", status: "available" },
    { id: "B2", label: "Bay 2", status: "available" },
    { id: "B3", label: "Bay 3", status: "occupied", patientId: "p3" },
    { id: "B4", label: "Bay 4", status: "available" },
    { id: "B5", label: "Bay 5", status: "available" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

// Vitals mini row
const VitalsMini: FC<{ vitals: IncomingPatient["vitals"] }> = ({ vitals }) => {
    const items = [
        { key: "hr", label: "HR", value: vitals.hr, unit: "bpm" },
        { key: "spo2", label: "SpO2", value: vitals.spo2, unit: "%" },
        { key: "sbp", label: "SBP", value: vitals.sbp, unit: "mmHg" },
        { key: "rr", label: "RR", value: vitals.rr, unit: "/min" },
        { key: "temp", label: "T", value: vitals.temp, unit: "°C" },
    ];
    return (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {items.map(({ key, label, value, unit }) => {
                const vs = getVitalStatus(key, value);
                const col = VITAL_COLOR[vs];
                return (
                    <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44 }}>
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace", lineHeight: 1.2 }}>
                            {key === "temp" ? value.toFixed(1) : value}
                        </span>
                        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.2)" }}>{unit}</span>
                    </div>
                );
            })}
        </div>
    );
};

// ER Prep checklist
interface PrepChecklistProps {
    steps: string[];
    patientId: string;
    checked: Record<string, boolean>;
    onToggle: (id: string) => void;
}
const PrepChecklist: FC<PrepChecklistProps> = ({ steps, patientId, checked, onToggle }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 2 }}>ER PREP</div>
        {steps.map((step, i) => {
            const key = `${patientId}-${i}`;
            const done = !!checked[key];
            return (
                <div
                    key={key}
                    onClick={() => onToggle(key)}
                    style={{
                        display: "flex", alignItems: "center", gap: 10,
                        cursor: "pointer", padding: "6px 8px", borderRadius: 8,
                        background: done ? "rgba(48,209,88,0.06)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${done ? "rgba(48,209,88,0.2)" : "rgba(255,255,255,0.06)"}`,
                        transition: "all 0.2s",
                    }}
                >
                    <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: done ? "#30d158" : "transparent",
                        border: `1.5px solid ${done ? "#30d158" : "rgba(255,255,255,0.2)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: "#fff", transition: "all 0.2s",
                    }}>
                        {done && "✓"}
                    </div>
                    <span style={{
                        fontSize: 11, color: done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.75)",
                        textDecoration: done ? "line-through" : "none", transition: "all 0.2s",
                    }}>
                        {step}
                    </span>
                </div>
            );
        })}
    </div>
);

// Patient card (expanded)
interface PatientCardProps {
    patient: IncomingPatient;
    expanded: boolean;
    onToggle: () => void;
    prepChecked: Record<string, boolean>;
    onPrepToggle: (id: string) => void;
}
const PatientCard: FC<PatientCardProps> = ({ patient, expanded, onToggle, prepChecked, onPrepToggle }) => {
    const pc = PRIORITY_COLOR[patient.priority];
    const sc = STATUS_COLOR[patient.status];
    const isIncoming = patient.status === "incoming";

    return (
        <div style={{
            background: PRIORITY_BG[patient.priority],
            border: `1px solid ${pc}30`,
            borderLeft: `4px solid ${pc}`,
            borderRadius: 16, overflow: "hidden",
            transition: "all 0.3s",
            boxShadow: patient.priority === "critical" ? `0 0 20px ${pc}10` : "none",
        }}>
            {/* Card header — always visible */}
            <div
                onClick={onToggle}
                style={{ padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: "#fff", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                            {patient.name}
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                            {patient.age}{patient.gender}
                        </span>
                        <span style={{
                            fontSize: 8, color: pc, background: pc + "20",
                            border: `1px solid ${pc}40`, borderRadius: 4, padding: "2px 7px", letterSpacing: 1,
                            textTransform: "uppercase",
                        }}>
                            {patient.priority}
                        </span>
                        <span style={{
                            fontSize: 8, color: sc, background: sc + "20",
                            border: `1px solid ${sc}40`, borderRadius: 4, padding: "2px 7px", letterSpacing: 1,
                        }}>
                            {STATUS_LABEL[patient.status]}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                        {patient.chiefComplaint}
                    </div>
                    <VitalsMini vitals={patient.vitals} />
                </div>

                {/* Right: ETA / bed / score */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                    {isIncoming && (
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>ETA</div>
                            <div style={{
                                fontSize: 20, fontWeight: 700, color: patient.eta <= 60 ? "#ff3b30" : "#fff",
                                fontFamily: "'DM Mono', monospace", lineHeight: 1,
                                animation: patient.eta <= 60 ? "blink 1s infinite" : "none",
                            }}>
                                {fmtEta(patient.eta)}
                            </div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{patient.unit}</div>
                        </div>
                    )}
                    {patient.arrivalTime && !isIncoming && (
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>ARRIVED</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: "#30d158", fontFamily: "'DM Mono', monospace" }}>
                                {patient.arrivalTime}
                            </div>
                        </div>
                    )}
                    {patient.assignedBed && (
                        <div style={{
                            fontSize: 10, color: pc, background: pc + "15",
                            border: `1px solid ${pc}30`, borderRadius: 6, padding: "3px 8px",
                            fontFamily: "'DM Mono', monospace", fontWeight: 600,
                        }}>
                            BED {patient.assignedBed}
                        </div>
                    )}
                    <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: pc + "20", border: `2px solid ${pc}50`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: pc, fontFamily: "'DM Mono', monospace",
                    }}>
                        {patient.triageScore}
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>NEWS2</div>
                </div>
            </div>

            {/* Expanded: case ID + prep checklist */}
            {expanded && (
                <div style={{
                    padding: "0 18px 16px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    animation: "fadeUp 0.2s ease",
                }}>
                    <div style={{ display: "flex", gap: 16, marginTop: 12, marginBottom: 4 }}>
                        <div>
                            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2 }}>CASE </span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "'DM Mono', monospace" }}>
                                {patient.caseId}
                            </span>
                        </div>
                    </div>
                    <PrepChecklist
                        steps={patient.erPrep}
                        patientId={patient.id}
                        checked={prepChecked}
                        onToggle={onPrepToggle}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                        <button style={{
                            flex: 1, padding: "10px", borderRadius: 10,
                            background: "rgba(10,132,255,0.1)", border: "1px solid rgba(10,132,255,0.3)",
                            color: "#0a84ff", fontSize: 10, fontFamily: "'DM Mono', monospace",
                            cursor: "pointer", letterSpacing: 1,
                        }}>
                            ASSIGN TEAM
                        </button>
                        <button style={{
                            flex: 1, padding: "10px", borderRadius: 10,
                            background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.25)",
                            color: "#30d158", fontSize: 10, fontFamily: "'DM Mono', monospace",
                            cursor: "pointer", letterSpacing: 1,
                        }}>
                            MARK RECEIVED
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Bed grid
const BedGrid: FC<{ beds: ERBed[]; patients: IncomingPatient[] }> = ({ beds, patients }) => {
    const BED_COLOR: Record<BedStatus, string> = {
        available: "#30d158",
        reserved: "#ff9f0a",
        occupied: "#ff3b30",
    };
    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {beds.map((bed) => {
                const patient = bed.patientId ? patients.find((p) => p.id === bed.patientId) : undefined;
                const col = BED_COLOR[bed.status];
                return (
                    <div key={bed.id} style={{
                        background: col + "10", border: `1px solid ${col}35`,
                        borderRadius: 10, padding: "10px 8px", textAlign: "center",
                    }}>
                        <div style={{ fontSize: 8, color: col, letterSpacing: 1, marginBottom: 4 }}>
                            {bed.status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>
                            {bed.label}
                        </div>
                        {patient && (
                            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 1.4 }}>
                                {patient.name.split(" ")[0]}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const HospitalER: FC = () => {
    const [patients, setPatients] = useState<IncomingPatient[]>(INITIAL_PATIENTS);
    const [expanded, setExpanded] = useState<string | null>("p1");
    const [prepChecked, setPrepChecked] = useState<Record<string, boolean>>({});
    const [time, setTime] = useState<string>("");
    const [tab, setTab] = useState<"stream" | "beds">("stream");

    // Live clock
    useEffect(() => {
        const tick = (): void =>
            setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    // ETA countdown for incoming patients
    useEffect(() => {
        const t = setInterval(() => {
            setPatients((prev) =>
                prev.map((p) =>
                    p.status === "incoming" && p.eta > 0
                        ? { ...p, eta: p.eta - 1 }
                        : p.status === "incoming" && p.eta <= 0
                            ? { ...p, status: "arrived" as ERStatus, arrivalTime: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) }
                            : p
                )
            );
        }, 1000);
        return () => clearInterval(t);
    }, []);

    const handlePrepToggle = (id: string): void =>
        setPrepChecked((prev) => ({ ...prev, [id]: !prev[id] }));

    const incomingCount = patients.filter((p) => p.status === "incoming").length;
    const criticalCount = patients.filter((p) => p.priority === "critical").length;
    const availableBeds = ER_BEDS.filter((b) => b.status === "available").length;

    return (
        <div style={{
            minHeight: "100vh", background: "#080b10", color: "#fff",
            fontFamily: "'DM Mono', monospace", display: "flex", flexDirection: "column",
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button:active { opacity: 0.7; }
      `}</style>

            {/* ── Top bar ── */}
            <div style={{
                padding: "0 20px", height: 56,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.02)", flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#30d158", animation: "blink 2s infinite" }} />
                        <span style={{ fontSize: 12, letterSpacing: 2, fontWeight: 600 }}>LILAVATI HOSPITAL</span>
                    </div>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>EMERGENCY · TRAUMA II</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {incomingCount > 0 && (
                        <div style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: "rgba(255,159,10,0.12)", border: "1px solid rgba(255,159,10,0.3)",
                            borderRadius: 20, padding: "4px 12px", animation: "blink 2s infinite",
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff9f0a" }} />
                            <span style={{ fontSize: 9, color: "#ff9f0a", letterSpacing: 1 }}>
                                {incomingCount} EN ROUTE
                            </span>
                        </div>
                    )}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{time}</span>
                </div>
            </div>

            {/* ── Stat strip ── */}
            <div style={{
                display: "flex", padding: "12px 20px", gap: 10,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
            }}>
                {([
                    { label: "INCOMING", value: incomingCount, color: "#ff9f0a" },
                    { label: "CRITICAL", value: criticalCount, color: "#ff3b30" },
                    { label: "TOTAL ACTIVE", value: patients.filter(p => p.status !== "transferred").length, color: "#fff" },
                    { label: "BEDS FREE", value: availableBeds, color: "#30d158" },
                ] as { label: string; value: number; color: string }[]).map(({ label, value, color }) => (
                    <div key={label} style={{
                        flex: 1, background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 12, padding: "12px 14px",
                    }}>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 6 }}>{label}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* ── Tab bar ── */}
            <div style={{
                display: "flex", padding: "10px 20px", gap: 8,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
            }}>
                {([
                    { key: "stream", label: "Patient Stream" },
                    { key: "beds", label: "Bed Status" },
                ] as { key: "stream" | "beds"; label: string }[]).map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        style={{
                            flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                            background: tab === key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                            color: tab === key ? "#fff" : "rgba(255,255,255,0.4)",
                            fontSize: 11, fontFamily: "'DM Mono', monospace",
                            letterSpacing: 1, transition: "all 0.2s",
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

                {/* Patient stream */}
                {tab === "stream" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "fadeUp 0.3s ease" }}>
                        {/* Sort: critical first, then incoming first */}
                        {[...patients]
                            .sort((a, b) => {
                                const po: Record<Priority, number> = { critical: 0, high: 1, moderate: 2, minor: 3 };
                                return po[a.priority] - po[b.priority];
                            })
                            .map((patient) => (
                                <PatientCard
                                    key={patient.id}
                                    patient={patient}
                                    expanded={expanded === patient.id}
                                    onToggle={() => setExpanded(expanded === patient.id ? null : patient.id)}
                                    prepChecked={prepChecked}
                                    onPrepToggle={handlePrepToggle}
                                />
                            ))}
                    </div>
                )}

                {/* Bed grid */}
                {tab === "beds" && (
                    <div style={{ animation: "fadeUp 0.3s ease" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 14 }}>
                            ER BED STATUS
                        </div>
                        <BedGrid beds={ER_BEDS} patients={patients} />

                        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                            {([
                                { label: "Available", color: "#30d158" },
                                { label: "Reserved", color: "#ff9f0a" },
                                { label: "Occupied", color: "#ff3b30" },
                            ] as { label: string; color: string }[]).map(({ label, color }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{
                            marginTop: 20, padding: "16px 18px",
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: 14,
                        }}>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, marginBottom: 14 }}>
                                INCOMING — BED RESERVATIONS
                            </div>
                            {patients
                                .filter((p) => p.status === "incoming" && p.assignedBed)
                                .map((p) => (
                                    <div key={p.id} style={{
                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                        marginBottom: 10, paddingBottom: 10,
                                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{p.name}</div>
                                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{p.unit} · {p.chiefComplaint}</div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>ETA</div>
                                                <div style={{
                                                    fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace",
                                                    color: p.eta <= 60 ? "#ff3b30" : "#fff",
                                                    animation: p.eta <= 60 ? "blink 1s infinite" : "none",
                                                }}>
                                                    {fmtEta(p.eta)}
                                                </div>
                                            </div>
                                            <div style={{
                                                fontSize: 11, color: PRIORITY_COLOR[p.priority],
                                                background: PRIORITY_COLOR[p.priority] + "15",
                                                border: `1px solid ${PRIORITY_COLOR[p.priority]}30`,
                                                borderRadius: 6, padding: "4px 10px",
                                                fontFamily: "'DM Mono', monospace", fontWeight: 600,
                                            }}>
                                                BED {p.assignedBed}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HospitalER;