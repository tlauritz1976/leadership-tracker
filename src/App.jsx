import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---- Static program data ----------------------------------------------

const DRILLS = [
  {
    id: 'voice',
    code: '01',
    name: 'Voice & Pace',
    duration: 120,
    goal: 'Drop pitch on statement endings. Half-speed reading.',
    instructions: [
      'Read one paragraph aloud at half your normal speed.',
      'Let pauses sit — silence reads as confidence, rushing reads as nerves.',
      'Drop pitch slightly at the end of statements (not questions).',
    ],
  },
  {
    id: 'sowhat',
    code: '02',
    name: 'The "So What" Drill',
    duration: 240,
    goal: 'Compress one topic into three widths.',
    instructions: [
      'Pick one real topic: a metric, a decision, a project status.',
      '30 sec: give full context.',
      '10 sec: state the headline only.',
      '1 sentence: the "so what" — why this matters to the room.',
    ],
  },
  {
    id: 'stillness',
    code: '03',
    name: 'Stillness Rep',
    duration: 120,
    goal: 'Hold 5 full seconds of silence without filling it.',
    instructions: [
      'Sit or stand as you would in a meeting.',
      'Say one firm sentence.',
      'Go completely silent and still for 5 full seconds.',
      'Continue — no filler, no fidgeting in the gap.',
    ],
  },
  {
    id: 'disagree',
    code: '04',
    name: 'Disagreement Rehearsal',
    duration: 240,
    goal: 'State a real opinion with zero hedge words.',
    instructions: [
      'Pick a real work opinion you hold.',
      'Say it flat, once, as a bare statement.',
      'Reframe: position → one piece of evidence → implication.',
      'Strip "I think," "maybe," "sort of," "just" — say it again clean.',
    ],
  },
];

const WEEKLY_NOTE = {
  full: ['Mon', 'Wed', 'Fri'],
  record: ['Tue', 'Thu'],
  live: 'Sat',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STORAGE_KEY = 'leadership-tracker:session-history';

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dayPlanFor(date) {
  const dow = date.getDay(); // 0 Sun ... 6 Sat
  if (dow === 2 || dow === 4) return 'record'; // Tue/Thu
  if (dow === 6) return 'live'; // Sat
  if (dow === 0) return 'rest'; // Sun — open day
  return 'full'; // Mon/Wed/Fri
}

// ---- Small presentational pieces ---------------------------------------

function IndicatorDot({ active }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: active ? '#E8A33D' : '#3A4048',
        boxShadow: active ? '0 0 6px #E8A33D99' : 'none',
        transition: 'all 200ms ease',
      }}
    />
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// ---- Main component ------------------------------------------------------

export default function App() {
  const [view, setView] = useState('session'); // 'session' | 'log'
  const [drillIndex, setDrillIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DRILLS[0].duration);
  const [running, setRunning] = useState(false);
  const [completedToday, setCompletedToday] = useState({});
  const [history, setHistory] = useState({}); // { '2026-06-19': { voice:true, ... } }
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const intervalRef = useRef(null);

  const today = new Date();
  const tKey = todayKey(today);
  const plan = dayPlanFor(today);

  // ---- Storage: load (localStorage — persists in this browser only) ----
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setHistory(parsed);
        if (parsed[tKey]) setCompletedToday(parsed[tKey]);
      }
    } catch (e) {
      setStorageError(true);
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Storage: persist on change ----
  const persist = useCallback((nextHistory) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      setStorageError(false);
    } catch (e) {
      setStorageError(true);
    }
  }, []);

  // ---- Timer ----
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            markComplete(DRILLS[drillIndex].id);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, drillIndex]);

  const markComplete = (drillId) => {
    setCompletedToday((prev) => {
      const next = { ...prev, [drillId]: true };
      setHistory((h) => {
        const nh = { ...h, [tKey]: next };
        persist(nh);
        return nh;
      });
      return next;
    });
  };

  const toggleComplete = (drillId) => {
    setCompletedToday((prev) => {
      const next = { ...prev, [drillId]: !prev[drillId] };
      setHistory((h) => {
        const nh = { ...h, [tKey]: next };
        persist(nh);
        return nh;
      });
      return next;
    });
  };

  const selectDrill = (idx) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setDrillIndex(idx);
    setSecondsLeft(DRILLS[idx].duration);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(DRILLS[drillIndex].duration);
  };

  const drill = DRILLS[drillIndex];
  const doneCount = Object.values(completedToday).filter(Boolean).length;
  const allDone = doneCount === DRILLS.length;

  // streak calc
  const streak = (() => {
    let count = 0;
    let cursor = new Date(today);
    for (;;) {
      const k = todayKey(cursor);
      const rec = k === tKey ? completedToday : history[k];
      const isFull = rec && Object.values(rec).filter(Boolean).length >= 3;
      if (k === tKey && !isFull) { cursor.setDate(cursor.getDate() - 1); continue; }
      if (!isFull) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  })();

  const last14 = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    const k = todayKey(d);
    const rec = k === tKey ? completedToday : history[k];
    const n = rec ? Object.values(rec).filter(Boolean).length : 0;
    return { k, d, n };
  });

  const planLabel = {
    full: 'Full Session',
    record: 'Record & Review',
    live: 'Live Application',
    rest: 'Open Day',
  }[plan];

  if (!loaded) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.mono, color: '#6B7280', fontSize: 13 }}>loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { background: #15171B; margin: 0; }
        button { font-family: inherit; cursor: pointer; }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={{ ...styles.mono, fontSize: 11, color: '#8A8F98', letterSpacing: '0.12em' }}>
            DAILY TRAINING · EXEC PRESENCE
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#F2F0EA', marginTop: 2 }}>
            {DAY_NAMES[today.getDay()]}, {today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...styles.mono, fontSize: 11, color: '#8A8F98' }}>STREAK</div>
          <div style={{ ...styles.mono, fontSize: 20, color: '#E8A33D', fontWeight: 700 }}>
            {streak}d
          </div>
        </div>
      </div>

      {/* Day plan banner */}
      <div style={styles.planBanner}>
        <IndicatorDot active={plan !== 'rest'} />
        <span style={{ ...styles.mono, fontSize: 12, color: '#C7CBD1', letterSpacing: '0.04em' }}>
          {planLabel.toUpperCase()}
        </span>
        {plan === 'live' && (
          <span style={{ fontSize: 12, color: '#8A8F98', marginLeft: 4 }}>
            — use the "so what" compression + one 5-sec pause in a real meeting today
          </span>
        )}
        {plan === 'record' && (
          <span style={{ fontSize: 12, color: '#8A8F98', marginLeft: 4 }}>
            — record a 60-sec update, watch once, note one fix
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['session', 'log'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              ...styles.tabBtn,
              color: view === v ? '#F2F0EA' : '#6B7280',
              borderBottom: view === v ? '2px solid #E8A33D' : '2px solid transparent',
            }}
          >
            {v === 'session' ? 'Session' : 'Progress'}
          </button>
        ))}
      </div>

      {view === 'session' ? (
        <>
          {/* Drill selector rail */}
          <div style={styles.rail}>
            {DRILLS.map((d, i) => (
              <button
                key={d.id}
                onClick={() => selectDrill(i)}
                style={{
                  ...styles.railItem,
                  borderColor: i === drillIndex ? '#E8A33D' : '#2A2F36',
                  background: i === drillIndex ? '#1C1F24' : 'transparent',
                }}
              >
                <div style={{ ...styles.mono, fontSize: 10, color: '#6B7280' }}>{d.code}</div>
                <div style={{ fontSize: 12, color: i === drillIndex ? '#F2F0EA' : '#9AA0A8', marginTop: 2 }}>
                  {d.name}
                </div>
                <div style={{ marginTop: 6 }}>
                  <IndicatorDot active={!!completedToday[d.id]} />
                </div>
              </button>
            ))}
          </div>

          {/* Timer panel */}
          <div style={styles.timerPanel}>
            <div style={{ ...styles.mono, fontSize: 12, color: '#8A8F98', letterSpacing: '0.08em' }}>
              {drill.code} · {drill.name.toUpperCase()}
            </div>
            <div
              style={{
                ...styles.mono,
                fontSize: 56,
                fontWeight: 700,
                color: running ? '#E8A33D' : '#F2F0EA',
                margin: '10px 0',
                letterSpacing: '0.02em',
                animation: running && secondsLeft <= 5 ? 'pulse 1s infinite' : 'none',
              }}
            >
              {formatTime(secondsLeft)}
            </div>
            <div style={{ fontSize: 13, color: '#9AA0A8', marginBottom: 16, fontStyle: 'italic' }}>
              {drill.goal}
            </div>

            <ul style={styles.instructions}>
              {drill.instructions.map((line, i) => (
                <li key={i} style={styles.instructionLine}>
                  <span style={{ color: '#E8A33D', marginRight: 8 }}>—</span>{line}
                </li>
              ))}
            </ul>

            <div style={styles.controls}>
              <button
                onClick={() => setRunning((r) => !r)}
                style={{ ...styles.primaryBtn }}
                disabled={secondsLeft === 0}
              >
                {running ? 'Pause' : secondsLeft === DRILLS[drillIndex].duration ? 'Start' : 'Resume'}
              </button>
              <button onClick={resetTimer} style={styles.ghostBtn}>Reset</button>
              <button
                onClick={() => toggleComplete(drill.id)}
                style={{
                  ...styles.ghostBtn,
                  borderColor: completedToday[drill.id] ? '#E8A33D' : '#3A4048',
                  color: completedToday[drill.id] ? '#E8A33D' : '#9AA0A8',
                }}
              >
                {completedToday[drill.id] ? '✓ Logged' : 'Mark done'}
              </button>
            </div>
          </div>

          {/* Today summary */}
          <div style={styles.summaryRow}>
            <span style={{ ...styles.mono, fontSize: 11, color: '#6B7280' }}>
              {doneCount} / {DRILLS.length} COMPLETE TODAY
            </span>
            {allDone && (
              <span style={{ ...styles.mono, fontSize: 11, color: '#E8A33D' }}>SESSION COMPLETE</span>
            )}
          </div>
        </>
      ) : (
        <div style={styles.logView}>
          <div style={{ ...styles.mono, fontSize: 11, color: '#8A8F98', letterSpacing: '0.08em', marginBottom: 10 }}>
            LAST 14 DAYS
          </div>
          <div style={styles.heatRow}>
            {last14.map(({ k, d, n }) => (
              <div key={k} style={styles.heatCol}>
                <div
                  style={{
                    ...styles.heatCell,
                    background:
                      n === 0 ? '#1C1F24' : n < 3 ? '#5C4520' : n < 4 ? '#8A6A26' : '#E8A33D',
                    borderColor: k === tKey ? '#E8A33D' : 'transparent',
                  }}
                  title={`${n}/4`}
                />
                <div style={{ ...styles.mono, fontSize: 9, color: '#6B7280', marginTop: 4 }}>
                  {DAY_NAMES[d.getDay()][0]}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...styles.mono, fontSize: 11, color: '#8A8F98', letterSpacing: '0.08em', margin: '24px 0 10px' }}>
            WEEKLY STRUCTURE
          </div>
          <div style={styles.weekGrid}>
            <div style={styles.weekRow}>
              <span style={styles.weekLabel}>Full session</span>
              <span style={styles.weekVal}>{WEEKLY_NOTE.full.join(' / ')}</span>
            </div>
            <div style={styles.weekRow}>
              <span style={styles.weekLabel}>Record & review</span>
              <span style={styles.weekVal}>{WEEKLY_NOTE.record.join(' / ')}</span>
            </div>
            <div style={styles.weekRow}>
              <span style={styles.weekLabel}>Live application</span>
              <span style={styles.weekVal}>{WEEKLY_NOTE.live}</span>
            </div>
          </div>

          <div style={{ ...styles.mono, fontSize: 11, color: '#8A8F98', letterSpacing: '0.08em', margin: '24px 0 10px' }}>
            CURRENT STREAK
          </div>
          <div style={{ fontSize: 13, color: '#C7CBD1', lineHeight: 1.5 }}>
            {streak} consecutive day{streak === 1 ? '' : 's'} with 3+ drills completed.
            {streak === 0 && ' Complete 3 of today\u2019s 4 drills to start a streak.'}
          </div>
        </div>
      )}

      {storageError && (
        <div style={{ ...styles.mono, fontSize: 10, color: '#B05050', marginTop: 16, textAlign: 'center' }}>
          progress couldn't be saved in this browser (private/incognito mode blocks this)
        </div>
      )}

      <div style={{ ...styles.mono, fontSize: 10, color: '#3A4048', marginTop: 28, textAlign: 'center' }}>
        progress is saved locally in this browser only
      </div>
    </div>
  );
}

// ---- Styles ----------------------------------------------------------

const styles = {
  page: {
    minHeight: '100vh',
    background: '#15171B',
    color: '#F2F0EA',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '20px 16px 40px',
    maxWidth: 480,
    margin: '0 auto',
  },
  mono: {
    fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottom: '1px solid #2A2F36',
  },
  planBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    background: '#1C1F24',
    borderRadius: 6,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  tabs: {
    display: 'flex',
    gap: 20,
    marginTop: 20,
    borderBottom: '1px solid #2A2F36',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 2px',
    letterSpacing: '0.02em',
  },
  rail: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    marginTop: 18,
  },
  railItem: {
    background: 'transparent',
    border: '1px solid #2A2F36',
    borderRadius: 6,
    padding: '10px 6px',
    textAlign: 'left',
    transition: 'all 150ms ease',
  },
  timerPanel: {
    marginTop: 18,
    padding: '22px 20px',
    background: '#1A1D22',
    border: '1px solid #2A2F36',
    borderRadius: 8,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'left',
    listStyle: 'none',
    padding: 0,
    margin: '0 0 20px',
  },
  instructionLine: {
    fontSize: 13,
    color: '#C7CBD1',
    lineHeight: 1.6,
    marginBottom: 4,
  },
  controls: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryBtn: {
    background: '#E8A33D',
    color: '#15171B',
    border: 'none',
    borderRadius: 6,
    padding: '10px 22px',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  ghostBtn: {
    background: 'transparent',
    color: '#9AA0A8',
    border: '1px solid #3A4048',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 14,
    padding: '0 2px',
  },
  logView: {
    marginTop: 20,
  },
  heatRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'space-between',
  },
  heatCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  heatCell: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 4,
    border: '1.5px solid transparent',
  },
  weekGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  weekRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    paddingBottom: 8,
    borderBottom: '1px solid #232730',
  },
  weekLabel: {
    color: '#9AA0A8',
  },
  weekVal: {
    color: '#E8A33D',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
  },
};
