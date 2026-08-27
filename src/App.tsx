import { useMemo, useRef, useState } from 'react';
import { LogChart } from './components/LogChart';
import { FieldSelector } from './components/FieldSelector';
import { parseForscanCsv } from './utils/parseCsv';
import type { ParsedLog } from './types';
import './App.css';

const SAMPLE_FILES = [
  { label: 'Sample 1', path: 'data/sample1.csv' },
  { label: 'Sample 2', path: 'data/sample2.csv' },
];

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<ParsedLog | null>(null);
  const [showMisfire, setShowMisfire] = useState(true);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOverApp, setIsDraggingOverApp] = useState(false);

  const chartColumns = useMemo(() => {
    if (!log) return [];
    return log.columns.filter((c) => c.isNumeric && c.key !== log.timeKey);
  }, [log]);

  const displayedColumns = useMemo(
    () => chartColumns.filter((column) => selectedColumnKeys.has(column.key)),
    [chartColumns, selectedColumnKeys],
  );

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
      const parsedLog = parseForscanCsv(fileName, csvText);
      setLog(parsedLog);
      setSelectedColumnKeys(
        new Set(parsedLog.columns.filter((column) => column.isNumeric && column.key !== parsedLog.timeKey).map((column) => column.key)),
      );
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
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Invalid file type. Please choose a CSV file.');
      return;
    }

    try {
      const text = await file.text();
      handleLoad(file.name, text);
    } catch {
      setError('The selected CSV file could not be read.');
    }
  };

  const handleAppDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOverApp(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleAppFile(file);
    }
  };

  const resetApp = () => {
    setLog(null);
    setShowMisfire(true);
    setSelectedColumnKeys(new Set());
    setError(null);
    setIsDraggingOverApp(false);
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
        <div>
          <p className="app__header-eyebrow">Vehicle diagnostics</p>
          <h1>
            <button type="button" onClick={resetApp} aria-label="Return to the ForScan Log Display start page">
              ForScan Log Display
            </button>
          </h1>
        </div>
        <p className="app__header-tagline">Turn ForScan CSV logs into clear, interactive charts.</p>
      </header>

      {error && <p className="app__error">{error}</p>}

      {log && (
        <>
          <div className="app__toolbar">
            <span>
              <strong>{log.fileName}</strong> · {log.rows.length} rows · {displayedColumns.length} of{' '}
              {chartColumns.length} fields displayed
            </span>
            <div className="app__toolbar-controls">
              <FieldSelector
                columns={chartColumns}
                selectedKeys={selectedColumnKeys}
                onChange={setSelectedColumnKeys}
              />
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
          </div>
          <div className="app__chart-stack">
            {displayedColumns.map((col, i) => (
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
            {displayedColumns.length === 0 && (
              <div className="app__no-fields">No fields selected. Use the Fields menu to choose charts to display.</div>
            )}
          </div>
        </>
      )}

      {!log && (
        <div className={`app__empty${isDraggingOverApp ? ' app__empty--active' : ''}`}>
          <div className="app__empty-card">
            <p className="app__eyebrow">Start here</p>
            <h2>Visualize a ForScan log</h2>
            <p>
              Load one of the bundled sample files, or drag a CSV export anywhere onto this page to generate
              charts automatically.
            </p>

            <input
              ref={fileInputRef}
              className="app__file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleAppFile(file);
                event.target.value = '';
              }}
            />

            <div className="app__sample-actions">
              {SAMPLE_FILES.map((sample) => (
                <button key={sample.path} onClick={() => void loadSample(sample.path, sample.label)}>
                  {sample.label}
                </button>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Upload CSV
              </button>
            </div>

            <button
              type="button"
              className="app__empty-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              Drop a CSV file anywhere on the app to import it, or tap here to choose one.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
