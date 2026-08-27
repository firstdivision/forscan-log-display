export interface LogColumn {
  /** Raw CSV header, e.g. "ECT(°C)" */
  key: string;
  /** Human label without unit, e.g. "ECT" */
  label: string;
  unit?: string;
  isNumeric: boolean;
}

export interface MisfireSpan {
  startTime: number;
  endTime: number;
}

export interface ParsedLog {
  fileName: string;
  columns: LogColumn[];
  timeKey: string;
  misfireKey?: string;
  /** Row values keyed by column key; numeric columns hold number | null (null = missing "-") */
  rows: Record<string, number | string | null>[];
  misfireSpans: MisfireSpan[];
}
