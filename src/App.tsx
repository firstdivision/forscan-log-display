import { useMemo, useState } from 'react';
import { LogLoader } from './components/LogLoader';
import { LogChart } from './components/LogChart';
import { parseForscanCsv } from './utils/parseCsv';
import type { ParsedLog } from './types';
import './App.css';

const SAMPLE_FILES = [
  { label: 'Sample 1', path: 'data/sample1.csv' },
  { label: 'Sample 2', path: 'data/sample2.csv' },
];

function App() {
  const [log, setLog] = useState<ParsedLog | null>(null);
  const [showMisfire, setShowMisfire] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOverApp, setIsDraggingOverApp] = useState(false);

  const chartColumns = useMemo(() => {
    if (!log) return [];
    return log.columns.filter((c) => c.isNumeric && c.key !== log.timeKey);
  }, [log]);

  // ForScan logs time in ms; charts display seconds.
  const timeScale = useMemo(() => {
    const unit = log?.columns.find((c) => c.key === log.timeKey)?.unit?.toLowerCase();
    return unit === 'ms' ? 1000 : 1;
  }, [log]);

  const times = useMemo(() => {
    if (!log) return [];
    return log.rows.map((row) => Number(row[log.timeKey]) / timeScale);
  }, [log, timeScale]);

  const misfireSpans = useMemo(() => {
    if (!log) return [];
    return log.misfireSpans.map((span) => ({
      startTime: span.startTime / timeScale,
      endTime: span.endTime / timeScale,
    }));
  }, [log, timeScale]);

  const handleLoad = (fileName: string, csvText: string) => {
    try {
      setLog(parseForscanCsv(fileName, csvText));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV file');
    }
  };

  const loadSample = async (path: string, label: string) => {
    const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
    const text = await response.text();
    handleLoad(label, text);
  };

  const handleAppFile = async (file: File) => {
    const text = await file.text();
    handleLoad(file.name, text);
  };

  const handleAppDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOverApp(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleAppFile(file);
    }
  };

  return (
    <div
      className={`app${isDraggingOverApp ? ' app--dragging' : ''}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingOverApp(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDraggingOverApp(false);
        }
      }}
      onDrop={(event) => {
        void handleAppDrop(event);
      }}
    >
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
          <div className="app__chart-stack">
            {chartColumns.map((col, i) => (
              <LogChart
                key={col.key}
                column={col}
                colorIndex={i}
                times={times}
                values={log.rows.map((row) => row[col.key] as number | null)}
                misfireSpans={misfireSpans}
                showMisfire={showMisfire}
              />
            ))}
          </div>
        </>
      )}

      {!log && !error && (
        <div className={`app__empty${isDraggingOverApp ? ' app__empty--active' : ''}`}>
          <div className="app__empty-card">
            <p className="app__eyebrow">Start here</p>
            <h2>Visualize a ForScan log</h2>
            <p>
              Load one of the bundled sample files, or drag a CSV export anywhere onto this page to generate
              charts automatically.
            </p>

            <div className="app__sample-actions">
              {SAMPLE_FILES.map((sample) => (
                <button key={sample.path} onClick={() => void loadSample(sample.path, sample.label)}>
                  {sample.label}
                </button>
              ))}
            </div>

            <div className="app__empty-dropzone">Drop a CSV file anywhere on the app to import it.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
