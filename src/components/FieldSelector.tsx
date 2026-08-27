import { useEffect, useRef, useState } from 'react';
import type { LogColumn } from '../types';

interface FieldSelectorProps {
  columns: LogColumn[];
  selectedKeys: Set<string>;
  onChange: (selectedKeys: Set<string>) => void;
}

export function FieldSelector({ columns, selectedKeys, onChange }: FieldSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const toggleColumn = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div className="field-selector" ref={containerRef}>
      <button
        className="field-selector__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        Fields: {selectedKeys.size} of {columns.length}
        <span className="field-selector__chevron" aria-hidden="true">▾</span>
      </button>

      {isOpen && (
        <div className="field-selector__menu" role="menu" aria-label="Choose fields to display">
          <div className="field-selector__actions">
            <button type="button" onClick={() => onChange(new Set(columns.map((column) => column.key)))}>
              Select all
            </button>
            <button type="button" onClick={() => onChange(new Set())}>
              Clear
            </button>
          </div>
          <div className="field-selector__options">
            {columns.map((column) => (
              <label className="field-selector__option" key={column.key}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(column.key)}
                  onChange={() => toggleColumn(column.key)}
                />
                <span>{column.label}</span>
                {column.unit && <small>{column.unit}</small>}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
