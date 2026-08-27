import Papa from 'papaparse';
import type { LogColumn, MisfireSpan, ParsedLog } from '../types';

const MISSING_VALUE = '-';

function splitHeader(header: string): { label: string; unit?: string } {
  const match = header.match(/^(.*?)\(([^()]*)\)$/);
  if (match) {
    return { label: match[1].trim(), unit: match[2].trim() };
  }
  return { label: header.trim() };
}

function isNumericToken(value: string): boolean {
  if (value === MISSING_VALUE || value === '') return true; // missing values don't disqualify a column
  return value.trim() !== '' && !Number.isNaN(Number(value));
}

export function parseForscanCsv(fileName: string, csvText: string): ParsedLog {
  const parsed = Papa.parse<string[]>(csvText, {
    delimiter: ';',
    skipEmptyLines: true,
  });

  const [headerRow, ...dataRows] = parsed.data as string[][];
  if (!headerRow) {
    throw new Error('CSV file has no header row');
  }

  const columns: LogColumn[] = headerRow.map((header, idx) => {
    const { label, unit } = splitHeader(header);
    const isNumeric = label.toLowerCase() !== 'misfire' && dataRows.every((row) => isNumericToken(row[idx] ?? MISSING_VALUE));
    return { key: header, label, unit, isNumeric };
  });

  const timeCol = columns.find((c) => c.label.toLowerCase() === 'time') ?? columns[0];
  const misfireCol = columns.find((c) => c.label.toUpperCase() === 'MISFIRE');

  const rows = dataRows.map((row) => {
    const record: Record<string, number | string | null> = {};
    columns.forEach((col, idx) => {
      const raw = row[idx];
      if (col.isNumeric) {
        record[col.key] = raw === undefined || raw === MISSING_VALUE || raw === '' ? null : Number(raw);
      } else {
        record[col.key] = raw ?? null;
      }
    });
    return record;
  });

  const misfireSpans: MisfireSpan[] = [];
  if (misfireCol) {
    let spanStart: number | null = null;
    for (const record of rows) {
      const time = record[timeCol.key];
      const misfiring = record[misfireCol.key] === 'Yes';
      if (misfiring && spanStart === null) {
        spanStart = typeof time === 'number' ? time : null;
      } else if (!misfiring && spanStart !== null) {
        const endTime = typeof time === 'number' ? time : spanStart;
        misfireSpans.push({ startTime: spanStart, endTime });
        spanStart = null;
      }
    }
    if (spanStart !== null) {
      const lastTime = rows.length > 0 ? rows[rows.length - 1][timeCol.key] : spanStart;
      misfireSpans.push({ startTime: spanStart, endTime: typeof lastTime === 'number' ? lastTime : spanStart });
    }
  }

  return {
    fileName,
    columns,
    timeKey: timeCol.key,
    misfireKey: misfireCol?.key,
    rows,
    misfireSpans,
  };
}
