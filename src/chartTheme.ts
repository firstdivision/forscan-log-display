export const CHART_GROUP_ID = 'forscan-log';

export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif';

export const THEME = {
  text: '#e6edf3',
  textMuted: '#8b949e',
  border: '#30363d',
  gridLine: 'rgba(139, 148, 158, 0.18)',
  tooltipBg: 'rgba(22, 27, 34, 0.95)',
  axisPointer: '#8b949e',
  axisPointerLabelBg: '#21262d',
  sliderBg: 'rgba(22, 27, 34, 0.6)',
  sliderFiller: 'rgba(88, 166, 255, 0.15)',
  sliderHandle: '#30363d',
  misfireArea: 'rgba(248, 81, 73, 0.16)',
  misfireBorder: 'rgba(248, 81, 73, 0.45)',
} as const;

export const SERIES_COLORS = [
  '#58a6ff',
  '#3fb950',
  '#d29922',
  '#bc8cff',
  '#39c5cf',
  '#f778ba',
  '#ff7b72',
  '#7ee787',
];

/** Formats a time value (already in seconds) as e.g. "45.3 s". */
export function formatSeconds(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} s`;
}
