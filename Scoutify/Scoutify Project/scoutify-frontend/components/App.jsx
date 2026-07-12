"use client";

import { useState, useRef, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight, RotateCcw, Zap, Paperclip } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  DATA LAYER — talks to your FastAPI backend                        */
/*                                                                     */
/*  This block shapes the request the same way scoutify.py's          */
/*  package_scouting_data() expects, and shapes the response the same */
/*  way that function returns it. The backend URL is read from        */
/*  NEXT_PUBLIC_API_URL (see .env.local.example) so it can point at   */
/*  localhost in dev and your deployed FastAPI host in production.    */
/* ------------------------------------------------------------------ */

const API_URL =process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
// Every position scoutify.py sees in nfl.csv (Pos column), grouped
// roughly offense -> defense -> special teams for the chip grid.
const POSITIONS = [
  { id: "QB", label: "Quarterback" },
  { id: "RB", label: "Running Back" },
  { id: "FB", label: "Fullback" },
  { id: "WR", label: "Wide Receiver" },
  { id: "TE", label: "Tight End" },
  { id: "OT", label: "Offensive Tackle" },
  { id: "OG", label: "Offensive Guard" },
  { id: "C", label: "Center" },
  { id: "OL", label: "Offensive Line" },
  { id: "EDGE", label: "Edge Rusher" },
  { id: "DE", label: "Defensive End" },
  { id: "DT", label: "Defensive Tackle" },
  { id: "DL", label: "Interior D-Line" },
  { id: "ILB", label: "Inside Linebacker" },
  { id: "OLB", label: "Outside Linebacker" },
  { id: "LB", label: "Linebacker" },
  { id: "CB", label: "Cornerback" },
  { id: "S", label: "Safety" },
  { id: "DB", label: "Defensive Back" },
  { id: "K", label: "Kicker" },
  { id: "P", label: "Punter" },
  { id: "LS", label: "Long Snapper" },
];

// Frame fields are always collected — Height/Weight aren't graded
// directly by scoutify.py, but package_scouting_data() still expects
// them on the stats payload alongside the drills.
const FRAME_FIELDS = [
  { id: "heightFt", label: "Height (ft)", unit: "ft", width: "s" },
  { id: "heightIn", label: "Height (in)", unit: "in", width: "s" },
  { id: "weight", label: "Weight", unit: "lbs", width: "m" },
];

// Testing fields mirror the columns scoutify.py drops per position:
//   QB, LS        -> no Bench
//   LB, EDGE      -> no 3Cone, no Shuttle
//   K, P          -> only Height/Weight/40yd (everything else dropped)
// backendKey is the exact key package_scouting_data() / groupGrades()
// looks up on the stats dict — keep it as-is when you wire the API.
const TESTING_FIELDS = [
  { id: "forty", label: "40-Yard Dash", unit: "sec", backendKey: "40yd", placeholder: "4.55", hideFor: [] },
  { id: "vertical", label: "Vertical Jump", unit: "in", backendKey: "Vertical", placeholder: "34", hideFor: ["K", "P"] },
  { id: "broad", label: "Broad Jump", unit: "in", backendKey: "Broad Jump", placeholder: "118", hideFor: ["K", "P"] },
  { id: "bench", label: "Bench Press", unit: "reps", backendKey: "Bench", placeholder: "18", hideFor: ["K", "P", "QB", "LS"] },
  { id: "threeCone", label: "3-Cone Drill", unit: "sec", backendKey: "3Cone", placeholder: "7.05", hideFor: ["K", "P", "LB", "EDGE"] },
  { id: "shuttle", label: "20-Yd Shuttle", unit: "sec", backendKey: "Shuttle", placeholder: "4.25", hideFor: ["K", "P", "LB", "EDGE"] },
];

function isFieldVisible(field, position) {
  return !field.hideFor.includes(position);
}

function visibleTestingFields(position) {
  return TESTING_FIELDS.filter((f) => isFieldVisible(f, position));
}

// The four grading pillars groupGrades()/gradeDF() return, in the
// same order scoutify.py returns them.
const GRADE_KEYS = ["speed", "power", "explosiveness", "agility"];
const AXIS_LABELS = {
  speed: "Speed",
  power: "Power",
  explosiveness: "Explosiveness",
  agility: "Agility",
};

// Label/unit lookup for the raw stat keys scoutify.py's roadmaps return
// (e.g. "40yd", "Bench", "Vertical") — built from TESTING_FIELDS so there
// is a single source of truth for how each stat is displayed.
const STAT_META = Object.fromEntries(
  TESTING_FIELDS.map((f) => [f.backendKey, { label: f.label, unit: f.unit }])
);

// Same five bands scoutify.py's roadmap functions use (get_tier /
// next_milestone), kept in sync here for the composite stamp title.
function feedbackTier(grade) {
  if (grade < 28) return "Needs Work";
  if (grade < 46) return "Below Average";
  if (grade < 64) return "Average";
  if (grade < 82) return "Above Average";
  return "Elite";
}
const TIER_COLOR = {
  "Needs Work": "var(--red-deep)",
  "Below Average": "var(--red)",
  "Average": "var(--ink-dim)",
  "Above Average": "var(--navy)",
  "Elite": "var(--navy-deep)",
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function statLabel(stat) {
  return STAT_META[stat]?.label ?? stat;
}

function statUnit(stat) {
  return STAT_META[stat]?.unit ?? "";
}

/**
 * fetchScoutingReport(position, stats, n_comparisons)
 * -----------------------------------------------------------------
 * Calls the FastAPI route wrapping package_scouting_data().
 * The resolved value keeps this shape (same keys
 * package_scouting_data() returns in scoutify.py):
 *   {
 *     position: string,
 *     input_stats: {...},
 *     grades: { speed, power, explosiveness, agility },     // 10-100
 *     comparisons: [{ Player, speed, power, explosiveness, agility }, ...],
 *     target_roadmap: {
 *       <category>: {
 *         grade, tier, next_grade, next_tier,
 *         targets: [{ stat, current, target }, ...]
 *       }, ...
 *     },
 *     comparison_roadmap: {
 *       player: string,
 *       diffs: { speed, power, explosiveness, agility },    // you - comp
 *       targets: [{ category, stat, current, target }, ...]
 *     }
 *   }
 * -----------------------------------------------------------------
 */
async function fetchScoutingReport(position, stats, n_comparisons = 5) {
  const res = await fetch(`${API_URL}/scout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position, stats, n_comparisons }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return await res.json();
}

/* ------------------------------------------------------------------ */
/*  UI                                                                 */
/* ------------------------------------------------------------------ */

const LOADING_LINES = [
  "Pulling your testing numbers…",
  "Weighing speed, power, explosiveness, agility…",
  "Cross-checking the draft file room…",
  "Ranking closest profiles…",
];

function StampGrade({ score }) {
  return (
    <div className="stamp-wrap">
      <svg viewBox="0 0 200 200" className="stamp-svg">
        <defs>
          <filter id="stampRough" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" />
          </filter>
        </defs>
        <g filter="url(#stampRough)">
          <circle cx="100" cy="100" r="86" fill="none" stroke="#a8382a" strokeWidth="4" />
          <circle cx="100" cy="100" r="72" fill="none" stroke="#a8382a" strokeWidth="2" />
        </g>
      </svg>
      <div className="stamp-center">
        <span className="stamp-score">{score}</span>
        <span className="stamp-of">COMPOSITE</span>
      </div>
    </div>
  );
}

export default function Scoutify() {
  const [stage, setStage] = useState("form"); // form | loading | results
  const [loadIdx, setLoadIdx] = useState(0);
  const [form, setForm] = useState({
    position: "WR",
    heightFt: "",
    heightIn: "",
    weight: "",
    forty: "",
    vertical: "",
    broad: "",
    bench: "",
    threeCone: "",
    shuttle: "",
  });
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const formRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (stage !== "loading") return;
    const id = setInterval(() => {
      setLoadIdx((i) => (i + 1) % LOADING_LINES.length);
    }, 650);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage === "results" && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [stage]);

  function update(key, value) {
    // Strip any minus signs so combine numbers can never go negative.
    const sanitized = typeof value === "string" ? value.replace(/-/g, "") : value;
    setForm((f) => ({ ...f, [key]: sanitized }));
  }

  function setPosition(id) {
    setForm((f) => ({ ...f, position: id }));
  }

  function blockNegativeKeys(e) {
    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
  }

  function isComplete() {
    const frameOk = FRAME_FIELDS.every((f) => String(form[f.id]).trim() !== "");
    const testingOk = visibleTestingFields(form.position).every(
      (f) => String(form[f.id]).trim() !== ""
    );
    return frameOk && testingOk;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isComplete()) return;
    setStage("loading");
    setError(null);

    const stats = {
      Height: Number(form.heightFt) * 12 + Number(form.heightIn),
      Weight: parseFloat(form.weight),
    };
    visibleTestingFields(form.position).forEach((f) => {
      stats[f.backendKey] = parseFloat(form[f.id]);
    });

    try {
      const [r] = await Promise.all([
        fetchScoutingReport(form.position, stats),
        new Promise((res) => setTimeout(res, 2200)),
      ]);
      setReport(r);
      setStage("results");
    } catch (err) {
      setError(err.message || "Something went wrong reaching the scouting API.");
      setStage("form");
    }
  }

  function reset() {
    setStage("form");
    setReport(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const positionLabel = POSITIONS.find((p) => p.id === form.position)?.label ?? "";
  const testingFields = visibleTestingFields(form.position);

  const compositeScore = report
    ? Math.round(GRADE_KEYS.reduce((sum, k) => sum + report.grades[k], 0) / GRADE_KEYS.length)
    : 0;

  const radarData = report
    ? GRADE_KEYS.map((k) => ({
        axis: AXIS_LABELS[k],
        you: report.grades[k],
        comp: report.comparisons[0]?.[k] ?? 0,
      }))
    : [];

  return (
    <div className="scoutify-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Courier+Prime:wght@400;700&display=swap');

        .scoutify-root {
          --paper: #f2eee2;
          --card: #faf7ee;
          --tan: #e6dfc7;
          --navy: #1f3a5f;
          --navy-deep: #14283f;
          --red: #a8382a;
          --red-deep: #8c2e22;
          --ink: #2b271f;
          --ink-dim: #736c5a;
          --line: #cabf9f;

          font-family: 'Inter', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }
        .scoutify-root *, .scoutify-root *::before, .scoutify-root *::after {
          box-sizing: border-box;
        }
        .scoutify-root ::selection { background: var(--red); color: var(--card); }

        .grain-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
        }

        .shell { position: relative; z-index: 1; max-width: 1040px; margin: 0 auto; padding: 0 24px; }

        /* NAV */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 26px 0 20px;
          border-bottom: 3px solid var(--navy);
          margin-bottom: 6px;
        }
        .wordmark { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 24px; letter-spacing: 0.3px; color: var(--navy); }
        .wordmark span { color: var(--red); }
        .file-stamp {
          display: none;
          font-family: 'Courier Prime', monospace;
          font-size: 10.5px;
          letter-spacing: 0.08em;
          color: var(--red);
          border: 2px solid var(--red);
          padding: 5px 10px;
          transform: rotate(-2deg);
          text-transform: uppercase;
        }
        @media (min-width: 640px) { .file-stamp { display: block; } }

        /* HERO */
        .hero { padding: 50px 0 64px; display: grid; gap: 44px; }
        @media (min-width: 900px) { .hero { grid-template-columns: 1.3fr 1fr; align-items: center; } }
        .eyebrow {
          font-family: 'Courier Prime', monospace;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--red);
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
        }
        .eyebrow::before { content: '\\25A0'; font-size: 8px; }
        .headline {
          font-family: 'Zilla Slab', serif;
          font-weight: 700;
          font-size: clamp(38px, 5.6vw, 60px);
          line-height: 1.15;
          letter-spacing: 0.1px;
          margin: 0 0 30px;
          color: var(--navy-deep);
        }
        .headline .accent {
          color: var(--red);
          position: relative;
          display: inline-block;
          padding-bottom: 12px;
        }
        .headline .accent::after {
          content: '';
          position: absolute;
          left: -2px;
          right: -4px;
          bottom: -4px;
          height: 10px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='14'%3E%3Cpath d='M2 8 Q 16 2, 30 8 T 58 8 T 86 8 T 114 8' fill='none' stroke='%23a8382a' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          background-size: 118px 14px;
        }
        .sub { font-size: 16.5px; line-height: 1.65; color: var(--ink-dim); max-width: 46ch; margin: 0 0 30px; }

        .cta {
          font-family: 'Courier Prime', monospace;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: var(--card);
          color: var(--red);
          border: 2px solid var(--red);
          padding: 14px 24px;
          border-radius: 2px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transform: rotate(-0.6deg);
          transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
        }
        .cta:hover { background: var(--red); color: var(--card); transform: rotate(-0.6deg) translateY(-2px); }
        .cta:active { transform: rotate(-0.6deg) translateY(1px) scale(0.97); transition: transform 0.05s ease; }

        /* HERO CARD (index card) */
        .hero-card-wrap { position: relative; }
        .hero-card-wrap::before, .hero-card-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--card);
          border: 1px solid var(--line);
        }
        .hero-card-wrap::before { transform: rotate(2.4deg); z-index: 0; }
        .hero-card-wrap::after { transform: rotate(-1.4deg); z-index: 0; }
        .hero-card {
          position: relative;
          z-index: 1;
          font-family: 'Courier Prime', monospace;
          background: var(--card);
          border: 1px solid var(--line);
          padding: 24px 22px 20px;
          transform: rotate(0.4deg);
        }
        .hero-card-tab {
          position: absolute;
          top: -14px;
          left: 20px;
          background: var(--navy);
          color: var(--paper);
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 5px 10px;
          z-index: 2;
          transform: rotate(-1deg);
        }
        .readout-row { display: flex; align-items: baseline; padding: 9px 0; }
        .readout-label { font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ink-dim); white-space: nowrap; }
        .readout-fill { flex: 1; border-bottom: 2px dotted var(--line); margin: 0 8px 4px; }
        .readout-value { font-size: 16px; color: var(--red); font-weight: 700; white-space: nowrap; }

        /* PANEL / DOSSIER */
        .panel-outer { margin-bottom: 34px; }
        .panel-tab {
          display: inline-block;
          background: var(--navy);
          color: var(--paper);
          font-family: 'Zilla Slab', serif;
          font-weight: 700;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 9px 22px 12px;
          clip-path: polygon(0 0, 100% 0, 93% 100%, 7% 100%);
          position: relative;
          margin-left: 18px;
          margin-bottom: -1px;
        }
        .panel {
          background: var(--card);
          border: 1px solid var(--line);
          border-top: 3px solid var(--navy);
          padding: 32px;
          position: relative;
        }
        .panel-hint {
          position: absolute;
          top: 16px;
          right: 20px;
          font-family: 'Courier Prime', monospace;
          font-size: 10.5px;
          color: var(--ink-dim);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* FORM */
        .form-group-label {
          font-family: 'Courier Prime', monospace;
          font-size: 11.5px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--navy);
          margin: 28px 0 14px;
          padding-top: 18px;
          border-top: 1px dashed var(--line);
        }
        .form-group-label:first-of-type { margin-top: 4px; padding-top: 0; border-top: none; }

        .field-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (min-width: 560px) { .field-grid { grid-template-columns: repeat(4, 1fr); } }
        .field-grid .w-s { grid-column: span 1; }
        .field-grid .w-m { grid-column: span 2; }
        @media (min-width: 560px) { .field-grid .w-m { grid-column: span 1; } }

        .field label {
          display: block;
          font-size: 11px;
          color: var(--ink-dim);
          margin-bottom: 7px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .field-input-wrap { position: relative; }
        .field input {
          width: 100%;
          background: var(--paper);
          border: 1px solid var(--line);
          color: var(--ink);
          font-family: 'Courier Prime', monospace;
          font-size: 15px;
          padding: 11px 40px 11px 12px;
          border-radius: 2px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .field input:focus { border-color: var(--navy); box-shadow: 0 0 0 3px rgba(31,58,95,0.1); }
        .field-unit {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'Courier Prime', monospace;
          font-size: 11px;
          color: var(--red);
          pointer-events: none;
        }

        .position-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 12px; }
        @media (min-width: 640px) { .position-grid { grid-template-columns: repeat(5, 1fr); } }
        .position-chip {
          position: relative;
          background: var(--paper);
          border: 1px solid var(--line);
          color: var(--ink-dim);
          font-family: 'Courier Prime', monospace;
          font-size: 13px;
          padding: 10px 8px;
          border-radius: 2px;
          cursor: pointer;
          text-align: center;
          transition: color 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
        }
        .position-chip:hover { border-color: var(--navy); color: var(--ink); transform: translateY(-2px); }
        .position-chip:active { transform: translateY(0) scale(0.94); }
        .position-chip.active { color: var(--red); font-weight: 700; }
        .position-chip.active::after {
          content: '';
          position: absolute;
          inset: -7px;
          border: 2px solid var(--red);
          border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
          transform: rotate(-2deg);
          pointer-events: none;
          animation: markIn 0.22s ease-out;
        }
        @keyframes markIn {
          from { opacity: 0; transform: rotate(-9deg) scale(0.75); }
          to { opacity: 1; transform: rotate(-2deg) scale(1); }
        }

        .submit-row { display: flex; justify-content: flex-end; margin-top: 32px; align-items: center; gap: 16px; }
        .submit-error {
          font-family: 'Courier Prime', monospace;
          font-size: 12px;
          color: var(--red);
          margin-right: auto;
        }
        .submit-btn {
          font-family: 'Courier Prime', monospace;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: var(--navy);
          color: var(--paper);
          border: 2px solid var(--navy);
          padding: 13px 22px;
          border-radius: 2px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.15s ease, opacity 0.15s ease, transform 0.12s ease;
        }
        .submit-btn:hover:not(:disabled) { background: var(--red); border-color: var(--red); transform: translateY(-2px); }
        .submit-btn:active:not(:disabled) { transform: translateY(1px) scale(0.97); transition: transform 0.05s ease; }
        .submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* LOADING */
        .loading-panel { text-align: center; padding: 64px 32px; }
        .loading-stamp {
          width: 52px; height: 52px; margin: 0 auto 22px;
          border: 3px solid var(--red);
          border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
          animation: stampPulse 1.1s ease-in-out infinite;
        }
        @keyframes stampPulse {
          0%, 100% { transform: rotate(-3deg) scale(1); opacity: 0.9; }
          50% { transform: rotate(2deg) scale(0.88); opacity: 0.55; }
        }
        .loading-text { font-family: 'Courier Prime', monospace; font-size: 13px; color: var(--ink-dim); letter-spacing: 0.02em; min-height: 20px; }
        .loading-text::after { content: '\\2588'; margin-left: 2px; animation: blink 1s step-start infinite; color: var(--red); }
        @keyframes blink { 50% { opacity: 0; } }

        /* RESULTS */
        .result-top { display: grid; gap: 30px; }
        @media (min-width: 780px) { .result-top { grid-template-columns: 200px 1fr; } }

        .stamp-wrap {
          position: relative;
          width: 190px;
          height: 190px;
          margin: 0 auto;
          transform: rotate(-6deg);
          animation: stampDown 0.4s cubic-bezier(0.2, 0.8, 0.3, 1);
        }
        @keyframes stampDown {
          0% { opacity: 0; transform: rotate(-22deg) scale(1.6); }
          70% { opacity: 1; transform: rotate(-4deg) scale(0.95); }
          100% { opacity: 1; transform: rotate(-6deg) scale(1); }
        }
        .stamp-svg { width: 100%; height: 100%; }
        .stamp-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .stamp-score { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 46px; line-height: 1; color: var(--red); }
        .stamp-of { font-family: 'Courier Prime', monospace; font-size: 10px; letter-spacing: 0.08em; color: var(--red); margin-top: 4px; }

        .tier-block { display: flex; flex-direction: column; justify-content: center; gap: 10px; }
        .tier-title {
          font-family: 'Zilla Slab', serif;
          font-weight: 700;
          font-size: 25px;
          color: var(--navy-deep);
          position: relative;
          display: inline-block;
          padding-bottom: 8px;
        }
        .tier-title::after {
          content: '';
          position: absolute;
          left: 0; bottom: 0;
          width: 100%; height: 8px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='12'%3E%3Cpath d='M2 7 Q 16 1, 30 7 T 58 7 T 86 7 T 114 7' fill='none' stroke='%23a8382a' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          background-size: 118px 12px;
        }
        .tier-desc { color: var(--ink-dim); font-size: 14px; line-height: 1.65; max-width: 50ch; }

        .radar-box { height: 300px; margin-top: 18px; }
        .legend-row { display: flex; gap: 22px; justify-content: center; margin-top: 4px; font-family: 'Courier Prime', monospace; font-size: 11px; color: var(--ink-dim); text-transform: uppercase; letter-spacing: 0.05em; }
        .legend-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }

        /* SCORE LIST */
        .score-list { display: flex; flex-direction: column; gap: 14px; margin-top: 30px; padding-top: 26px; border-top: 1px dashed var(--line); }
        .score-row { display: grid; grid-template-columns: 120px 1fr 34px; align-items: center; gap: 14px; }
        .score-label { font-family: 'Courier Prime', monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-dim); }
        .score-bar-track { height: 8px; background: var(--tan); border: 1px solid var(--line); overflow: hidden; }
        .score-bar-fill { height: 100%; background: var(--navy); }
        .score-value { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 15px; color: var(--red); text-align: right; }

        /* ROADMAP */
        .roadmap-list { display: flex; flex-direction: column; gap: 30px; }
        .roadmap-row:not(:first-child) { padding-top: 26px; border-top: 1px dashed var(--line); }
        .roadmap-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
        .roadmap-metric { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 17px; color: var(--navy-deep); }
        .roadmap-tier {
          font-family: 'Courier Prime', monospace;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 10px;
          border: 1px solid;
          border-radius: 2px;
        }
        .roadmap-track { position: relative; height: 10px; background: var(--tan); border: 1px solid var(--line); border-radius: 2px; margin-bottom: 8px; }
        .roadmap-marker {
          position: absolute;
          top: 50%;
          width: 24px;
          height: 24px;
          margin-left: -12px;
          transform: translateY(-50%);
          background: var(--red);
          color: var(--card);
          border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Courier Prime', monospace;
          font-weight: 700;
          font-size: 10px;
          box-shadow: 0 0 0 3px var(--card);
        }
        .roadmap-scale { display: flex; justify-content: space-between; font-family: 'Courier Prime', monospace; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-dim); }

        /* TARGET ROADMAP — next-milestone raw stat targets */
        .target-block {
          margin-top: 14px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-left: 3px solid var(--navy);
          padding: 12px 16px;
        }
        .target-block-maxed {
          font-family: 'Courier Prime', monospace;
          font-size: 12px;
          color: var(--ink-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-left-color: var(--red);
        }
        .target-label {
          font-family: 'Courier Prime', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--navy);
          margin-bottom: 8px;
        }
        .target-stats { display: flex; flex-direction: column; gap: 6px; }
        .target-stat { display: flex; justify-content: space-between; gap: 12px; font-family: 'Courier Prime', monospace; font-size: 13px; }
        .target-stat-label { color: var(--ink-dim); }
        .target-stat-value { color: var(--red); font-weight: 700; white-space: nowrap; }

        /* COMPARISON ROADMAP — gap to closest comp */
        .diff-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
        .diff-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px dashed var(--line); }
        .diff-label { font-family: 'Courier Prime', monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-dim); }
        .diff-value { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 16px; }
        .diff-pos { color: var(--navy); }
        .diff-neg { color: var(--red); }
        .comp-target-list { display: flex; flex-direction: column; gap: 12px; padding-top: 4px; }
        .comp-target-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Courier Prime', monospace;
          font-size: 13px;
          color: var(--ink);
        }
        .comp-target-arrow { color: var(--red); flex-shrink: 0; }
        .comp-target-empty {
          font-family: 'Courier Prime', monospace;
          font-size: 12.5px;
          color: var(--ink-dim);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        /* COMPS */
        .comp-list { display: flex; flex-direction: column; gap: 18px; }
        .comp-card {
          position: relative;
          display: grid;
          grid-template-columns: 34px 1fr auto;
          align-items: center;
          gap: 16px;
          background: var(--paper);
          border: 1px solid var(--line);
          padding: 16px 18px 16px 22px;
        }
        .comp-card {
          animation: cardIn 0.35s ease-out backwards;
        }
        .comp-card:nth-child(1) { transform: rotate(-0.5deg); animation-delay: 0.05s; }
        .comp-card:nth-child(2) { transform: rotate(0.4deg); animation-delay: 0.15s; }
        .comp-card:nth-child(3) { transform: rotate(-0.3deg); animation-delay: 0.25s; }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; }
        }
        .comp-clip { position: absolute; top: -10px; left: 14px; color: var(--ink-dim); opacity: 0.65; transform: rotate(-25deg); }
        .comp-rank {
          font-family: 'Zilla Slab', serif;
          font-weight: 700;
          font-size: 15px;
          color: var(--card);
          background: var(--red);
          width: 26px; height: 26px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .comp-name { font-family: 'Zilla Slab', serif; font-weight: 700; font-size: 16px; color: var(--navy-deep); }
        .comp-stats { display: flex; gap: 14px; }
        .comp-chip { text-align: center; min-width: 34px; }
        .comp-chip-label { font-family: 'Courier Prime', monospace; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ink-dim); }
        .comp-chip-value { font-family: 'Courier Prime', monospace; font-size: 15px; font-weight: 700; color: var(--red); }

        .reset-row { display: flex; justify-content: center; margin-top: 32px; }
        .reset-btn {
          font-family: 'Courier Prime', monospace;
          font-size: 12px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: transparent;
          border: 1px solid var(--navy);
          color: var(--navy);
          padding: 11px 20px;
          border-radius: 2px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
        }
        .reset-btn:hover { background: var(--navy); color: var(--paper); transform: translateY(-1px); }
        .reset-btn:active { transform: translateY(0) scale(0.96); }

        .disclaimer {
          font-family: 'Courier Prime', monospace;
          font-size: 11.5px;
          color: var(--ink-dim);
          line-height: 1.7;
          padding: 26px 0 60px;
          max-width: 62ch;
          margin: 0 auto;
          border-top: 1px dashed var(--line);
          padding-top: 20px;
        }
        .disclaimer b { color: var(--red); }

        @media (prefers-reduced-motion: reduce) {
          .loading-stamp { animation: none; }
        }
      `}</style>

      <div className="grain-overlay" />

      <div className="shell">
        <nav className="nav">
          <div className="wordmark">SCOUT<span>IFY</span></div>
          <div className="file-stamp">Confidential Scouting File</div>
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">File No. 001 — Combine Analysis</div>
            <h1 className="headline">
              Every prospect gets<br />an NFL <span className="accent">comp.</span>
            </h1>
            <p className="sub">
              Enter your combine numbers and Scoutify grades you across four
              pillars — speed, power, explosiveness, and agility — benchmarked
              against the draft-class combine dataset, then finds your
              closest statistical match.
            </p>
            <button
              className="cta"
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              Build my report <ArrowRight size={15} />
            </button>
          </div>

          <div className="hero-card-wrap">
            <div className="hero-card">
              <div className="hero-card-tab">Sample File</div>
              <div className="readout-row">
                <span className="readout-label">40-Yard Dash</span>
                <span className="readout-fill" />
                <span className="readout-value">4.38s</span>
              </div>
              <div className="readout-row">
                <span className="readout-label">Vertical Jump</span>
                <span className="readout-fill" />
                <span className="readout-value">39.0"</span>
              </div>
              <div className="readout-row">
                <span className="readout-label">Broad Jump</span>
                <span className="readout-fill" />
                <span className="readout-value">126"</span>
              </div>
              <div className="readout-row">
                <span className="readout-label">Bench Press</span>
                <span className="readout-fill" />
                <span className="readout-value">18 reps</span>
              </div>
            </div>
          </div>
        </section>

        <div ref={formRef} className="panel-outer">
          <div className="panel-tab">Combine Card</div>
          <div className="panel">
            <div className="panel-hint">All fields required</div>

            <form onSubmit={handleSubmit}>
              <div className="form-group-label">Position</div>
              <div className="position-grid">
                {POSITIONS.map((p) => (
                  <div
                    key={p.id}
                    className={`position-chip ${form.position === p.id ? "active" : ""}`}
                    onClick={() => setPosition(p.id)}
                  >
                    {p.id}
                  </div>
                ))}
              </div>

              <div className="form-group-label">Frame</div>
              <div className="field-grid">
                {FRAME_FIELDS.map((f) => (
                  <div className={`field w-${f.width}`} key={f.id}>
                    <label>{f.label}</label>
                    <div className="field-input-wrap">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        placeholder={f.id === "heightFt" ? "6" : f.id === "heightIn" ? "2" : "215"}
                        value={form[f.id]}
                        onChange={(e) => update(f.id, e.target.value)}
                        onKeyDown={blockNegativeKeys}
                      />
                      <span className="field-unit">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group-label">Testing Numbers</div>
              <div className="field-grid">
                {testingFields.map((f) => (
                  <div className="field w-m" key={f.id}>
                    <label>{f.label}</label>
                    <div className="field-input-wrap">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        placeholder={f.placeholder}
                        value={form[f.id]}
                        onChange={(e) => update(f.id, e.target.value)}
                        onKeyDown={blockNegativeKeys}
                      />
                      <span className="field-unit">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="submit-row">
                {error && <span className="submit-error">{error}</span>}
                <button type="submit" className="submit-btn" disabled={!isComplete()}>
                  <Zap size={15} /> Generate Report
                </button>
              </div>
            </form>
          </div>
        </div>

        {stage === "loading" && (
          <div className="panel-outer">
            <div className="panel-tab">Processing</div>
            <div className="panel loading-panel">
              <div className="loading-stamp" />
              <div className="loading-text">{LOADING_LINES[loadIdx]}</div>
            </div>
          </div>
        )}

        {stage === "results" && report && (
          <div ref={resultsRef}>
            {/* Radar chart + score list */}
            <div className="panel-outer">
              <div className="panel-tab">Scouting Report</div>
              <div className="panel">
                <div className="panel-hint">{positionLabel}</div>

                <div className="result-top">
                  <StampGrade score={compositeScore} />
                  <div className="tier-block">
                    <div className="tier-title">{feedbackTier(compositeScore)}</div>
                    <p className="tier-desc">
                      This composite blends your speed, power, explosiveness
                      and agility grades into a single number, benchmarked
                      against the {positionLabel.toLowerCase()} testing pool.
                    </p>
                  </div>
                </div>

                <div className="radar-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="#cabf9f" />
                      <PolarAngleAxis
                        dataKey="axis"
                        tick={{ fill: "#736c5a", fontSize: 11, fontFamily: "Courier Prime, monospace" }}
                      />
                      <Radar
                        name="You"
                        dataKey="you"
                        stroke="#1f3a5f"
                        fill="#1f3a5f"
                        fillOpacity={0.28}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Top comp"
                        dataKey="comp"
                        stroke="#a8382a"
                        fill="#a8382a"
                        fillOpacity={0.14}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend-row">
                  <span><span className="legend-dot" style={{ background: "#1f3a5f" }} />You</span>
                  <span><span className="legend-dot" style={{ background: "#a8382a" }} />{report.comparisons[0]?.Player}</span>
                </div>

                <div className="score-list">
                  {GRADE_KEYS.map((k) => (
                    <div className="score-row" key={k}>
                      <span className="score-label">{AXIS_LABELS[k]}</span>
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{ width: `${report.grades[k]}%` }} />
                      </div>
                      <span className="score-value">{report.grades[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Roadmap #1 — data-driven next-milestone targets, straight from scoutify.py's target_roadmap() */}
            <div className="panel-outer">
              <div className="panel-tab">Development Roadmap</div>
              <div className="panel">
                <div className="panel-hint">Next milestone</div>
                <div className="roadmap-list">
                  {GRADE_KEYS.filter((k) => report.target_roadmap?.[k]).map((k) => {
                    const entry = report.target_roadmap[k];
                    const pct = clamp(((entry.grade - 10) / 90) * 100, 0, 100);
                    return (
                      <div className="roadmap-row" key={k}>
                        <div className="roadmap-head">
                          <span className="roadmap-metric">{AXIS_LABELS[k]}</span>
                          <span
                            className="roadmap-tier"
                            style={{ color: TIER_COLOR[entry.tier], borderColor: TIER_COLOR[entry.tier] }}
                          >
                            {entry.tier}
                          </span>
                        </div>
                        <div className="roadmap-track">
                          <div className="roadmap-marker" style={{ left: `${pct}%` }}>{entry.grade}</div>
                        </div>
                        <div className="roadmap-scale">
                          <span>Needs Work</span>
                          <span>Below Avg</span>
                          <span>Average</span>
                          <span>Above Avg</span>
                          <span>Elite</span>
                        </div>

                        {entry.next_grade != null ? (
                          <div className="target-block">
                            <div className="target-label">
                              Next milestone: {entry.next_tier} ({entry.next_grade})
                            </div>
                            <div className="target-stats">
                              {entry.targets.map((t) => (
                                <div className="target-stat" key={t.stat}>
                                  <span className="target-stat-label">{statLabel(t.stat)}</span>
                                  <span className="target-stat-value">
                                    {t.current}{statUnit(t.stat)} → {t.target}{statUnit(t.stat)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="target-block target-block-maxed">
                            Already elite in this category.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Roadmap #2 — gap to the closest NFL comp, straight from scoutify.py's comparison_roadmap() */}
            {report.comparison_roadmap && (
              <div className="panel-outer">
                <div className="panel-tab">Path to {report.comparison_roadmap.player}</div>
                <div className="panel">
                  <div className="panel-hint">Closest comp breakdown</div>

                  <div className="diff-list">
                    {GRADE_KEYS.map((k) => {
                      const diff = report.comparison_roadmap.diffs[k];
                      const positive = diff >= 0;
                      return (
                        <div className="diff-row" key={k}>
                          <span className="diff-label">{AXIS_LABELS[k]}</span>
                          <span className={`diff-value ${positive ? "diff-pos" : "diff-neg"}`}>
                            {positive ? "+" : ""}{diff}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {report.comparison_roadmap.targets.length > 0 ? (
                    <div className="comp-target-list">
                      {report.comparison_roadmap.targets.map((t) => (
                        <div className="comp-target-row" key={`${t.category}-${t.stat}`}>
                          <ArrowRight size={13} className="comp-target-arrow" />
                          <span>
                            Improve {statLabel(t.stat)} from {t.current}{statUnit(t.stat)} to {t.target}{statUnit(t.stat)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="comp-target-empty">
                      You already match or beat {report.comparison_roadmap.player} across the board.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comparisons */}
            <div className="panel-outer">
              <div className="panel-tab">Top Comps</div>
              <div className="panel">
                <div className="panel-hint">Closest profiles</div>
                <div className="comp-list">
                  {report.comparisons.map((c, i) => (
                    <div className="comp-card" key={c.Player}>
                      <Paperclip size={20} className="comp-clip" />
                      <div className="comp-rank">{i + 1}</div>
                      <div className="comp-name">{c.Player}</div>
                      <div className="comp-stats">
                        {GRADE_KEYS.map((k) => (
                          <div className="comp-chip" key={k}>
                            <div className="comp-chip-label">{AXIS_LABELS[k].slice(0, 3)}</div>
                            <div className="comp-chip-value">{c[k]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="reset-row">
              <button className="reset-btn" onClick={reset}>
                <RotateCcw size={13} /> Run another file
              </button>
            </div>
          </div>
        )}

        <div className="disclaimer">
          <b>Note:</b> this report is generated by the FastAPI backend
          wrapping scoutify.py's package_scouting_data() — set
          NEXT_PUBLIC_API_URL to point at your deployed API host.
        </div>
      </div>
    </div>
  );
}
