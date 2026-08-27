import { useMemo, useState } from 'react';
import { LogLoader } from './components/LogLoader';
import { LogChart } from './components/LogChart';
import { parseForscanCsv } from './utils/parseCsv';
import type { ParsedLog } from './types';
import './App.css';

function App() {
  const [log, setLog] = useState<ParsedLog | null>(null);
  const [showMisfire, setShowMisfire] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chartColumns = useMemo(() => {
    if (!log) return [];
    return log.columns.filter((c) => c.isNumeric && c.key !== log.timeKey);
  }, [log]);

  const times = useMemo(() => {
    if (!log) return [];
    return log.rows.map((row) => Number(row[log.timeKey]));
  }, [log]);

  const handleLoad = (fileName: string, csvText: string) => {
    try {
      setLog(parseForscanCsv(fileName, csvText));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV file');
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>ForScan Log Display</h1>
        <LogLoader onLoad={handleLoad} />
      </header>

      {error && <p className="app__error">{error}</p>}

      {log && (
        <>
          <div className="app__toolbar">
            <span>
              <strong>{log.fileName}</strong> · {log.rows.length} rows · {chartColumns.length} charted columns
            </span>
            {log.misfireSpans.length > 0 && (
              <label className="app__misfire-toggle">
                <input
                  type="checkbox"
                  checked={showMisfire}
                  onChange={(e) => setShowMisfire(e.target.checked)}
                />
                Highlight misfire spans ({log.misfireSpans.length})
              </label>
            )}
          </div>
          <div className="app__chart-grid">
            {chartColumns.map((col) => (
              <LogChart
                key={col.key}
                column={col}
                timeLabel="time (ms)"
                times={times}
                values={log.rows.map((row) => row[col.key] as number | null)}
                misfireSpans={log.misfireSpans}
                showMisfire={showMisfire}
              />
            ))}
          </div>
        </>
      )}

      {!log && !error && <p className="app__hint">Load a sample or drop a CSV file to get started.</p>}
    </div>
  );
}

export default App;
