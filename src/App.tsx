import { useEffect, useMemo, useRef, useState } from 'react';
import { LogChart } from './components/LogChart';
import { CombinedChart, type CombinedScaleMode } from './components/CombinedChart';
import { FieldSelector } from './components/FieldSelector';
import { parseForscanCsv } from './utils/parseCsv';
import type { ParsedLog } from './types';
import './App.css';

const SAMPLE_FILES = [
  { label: 'Sample 1', path: 'data/sample1.csv' },
  { label: 'Sample 2', path: 'data/sample2.csv' },
  { label: 'Sample 3', path: 'data/sample3.csv' },
  { label: 'Sample 4', path: 'data/sample4.csv' },
];

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [log, setLog] = useState<ParsedLog | null>(null);
  const [showMisfire, setShowMisfire] = useState(true);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'stacked' | 'combined'>('stacked');
  const [scaleMode, setScaleMode] = useState<CombinedScaleMode>('normalized');
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOverApp, setIsDraggingOverApp] = useState(false);
  const [page, setPage] = useState<'home' | 'about'>(() =>
    window.location.hash === '#about' ? 'about' : 'home',
  );

  useEffect(() => {
    const handleHashChange = () => setPage(window.location.hash === '#about' ? 'about' : 'home');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const valuesByKey = useMemo(() => {
    if (!log) return {};
    const result: Record<string, (number | null)[]> = {};
    for (const column of displayedColumns) {
      result[column.key] = log.rows.map((row) => row[column.key] as number | null);
    }
    return result;
  }, [log, displayedColumns]);

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
    window.location.hash = '';
    setPage('home');
    setLog(null);
    setShowMisfire(true);
    setSelectedColumnKeys(new Set());
    setViewMode('stacked');
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
        <p className="app__header-tagline">
          Turn ForScan CSV logs into clear, interactive charts. <a href="#about">Read more...</a>
        </p>
      </header>

      {page === 'home' && error && <p className="app__error">{error}</p>}

      {page === 'home' && log && (
        <>
          <div className="app__toolbar">
            <span>
              <strong>{log.fileName}</strong> · {log.rows.length} rows · {displayedColumns.length} of{' '}
              {chartColumns.length} fields displayed
            </span>
            <div className="app__toolbar-controls">
              <div className="app__view-toggle" role="group" aria-label="Chart layout">
                <button
                  type="button"
                  aria-pressed={viewMode === 'stacked'}
                  onClick={() => setViewMode('stacked')}
                >
                  Stacked
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'combined'}
                  onClick={() => setViewMode('combined')}
                >
                  Combined
                </button>
              </div>
              {viewMode === 'combined' && (
                <label className="app__scale-select">
                  Scale
                  <select
                    value={scaleMode}
                    onChange={(e) => setScaleMode(e.target.value as CombinedScaleMode)}
                  >
                    <option value="normalized">Normalized (0–100%)</option>
                    <option value="raw">Raw values</option>
                  </select>
                </label>
              )}
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
          {displayedColumns.length === 0 ? (
            <div className="app__no-fields">
              No fields selected. Use the Fields menu to choose charts to display.
            </div>
          ) : viewMode === 'combined' ? (
            <CombinedChart
              columns={displayedColumns}
              times={times}
              valuesByKey={valuesByKey}
              misfireSpans={misfireSpans}
              showMisfire={showMisfire}
              scaleMode={scaleMode}
            />
          ) : (
            <div className="app__chart-stack">
              {displayedColumns.map((col, i) => (
                <LogChart
                  key={col.key}
                  column={col}
                  colorIndex={i}
                  times={times}
                  values={valuesByKey[col.key]}
                  misfireSpans={misfireSpans}
                  showMisfire={showMisfire}
                />
              ))}
            </div>
          )}
        </>
      )}

      {page === 'home' && !log && (
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

      {page === 'about' && (
        <main className="app__about">
          <div className="app__about-card">
            <p className="app__eyebrow">About</p>
            <h2>A clearer look at your ForScan logs</h2>
            <p>
              ForScan Log Display turns a CSV diagnostic log into interactive charts, making it easier to see
              how your vehicle's readings change over time. Everything happens in your browser—there is no
              account to create and your log is not uploaded to a server.
            </p>

            <h3>How to use it</h3>
            <p>
              Start with one of the sample logs, or choose your own ForScan CSV file. You can also drag a CSV
              anywhere onto the home page. Once it loads, use the Fields menu to show or hide readings and
              hover over a chart to inspect individual values. If the log contains misfire information, you can
              highlight those periods on the charts too.
            </p>

            <h3>Stacked and combined views</h3>
            <p>
              The Stacked view gives each reading its own chart, one above the other, with the zoom and
              crosshair kept in sync. The Combined view draws every selected reading on a single chart that
              fills the screen, with a legend you can click to hide or highlight individual lines. It is the
              quickest way to see how several readings move together—handy when you are trying to work out what
              led up to a misfire.
            </p>
            <p>
              Because readings use very different units, the combined chart normalizes each line to a
              percentage of its own range by default, so engine speed, temperature, and voltage can share one
              axis. The tooltip still shows the real measured values. If you would rather see the actual numbers
              plotted together, switch the Scale option to “Raw values”.
            </p>

            <h3>About ForScan</h3>
            <p>
              ForScan is vehicle-diagnostic software designed especially for Ford, Mazda, Lincoln, and Mercury
              vehicles. Visit the <a href="https://forscan.org/">official ForScan website</a> to learn more about
              the software and supported adapters.
            </p>

            <a className="app__about-back" href="#">
              {log ? `Back to ${log.fileName}` : 'Back to the home page'}
            </a>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
