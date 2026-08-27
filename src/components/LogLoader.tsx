import { useCallback, useRef, useState } from 'react';

const SAMPLE_FILES = [
  { label: 'Sample 1', path: 'data/sample1.csv' },
  { label: 'Sample 2', path: 'data/sample2.csv' },
];

interface LogLoaderProps {
  onLoad: (fileName: string, csvText: string) => void;
}

export function LogLoader({ onLoad }: LogLoaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      onLoad(file.name, text);
    },
    [onLoad],
  );

  const loadSample = useCallback(
    async (path: string, label: string) => {
      const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
      const text = await response.text();
      onLoad(label, text);
    },
    [onLoad],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) void loadFile(file);
    },
    [loadFile],
  );

  return (
    <div className="log-loader">
      <div className="log-loader__samples">
        <span>Load sample:</span>
        {SAMPLE_FILES.map((sample) => (
          <button key={sample.path} onClick={() => void loadSample(sample.path, sample.label)}>
            {sample.label}
          </button>
        ))}
      </div>
      <div
        className={`log-loader__dropzone${isDragging ? ' log-loader__dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        Drop a ForScan CSV file here, or click to browse
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void loadFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
