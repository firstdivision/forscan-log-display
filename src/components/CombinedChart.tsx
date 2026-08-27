import { useEffect, useLayoutEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { LogColumn, MisfireSpan } from '../types';
import { FONT_FAMILY, THEME, formatSeconds, seriesColor } from '../chartTheme';

export type CombinedScaleMode = 'normalized' | 'raw';

interface CombinedChartProps {
  columns: LogColumn[];
  times: number[];
  /** Raw values per column key, aligned with `times`. */
  valuesByKey: Record<string, (number | null)[]>;
  misfireSpans: MisfireSpan[];
  showMisfire: boolean;
  scaleMode: CombinedScaleMode;
}

interface TooltipParam {
  seriesName: string;
  marker: string;
  axisValue: number;
  value: [number, number | null, number | null];
}

export function CombinedChart({
  columns,
  times,
  valuesByKey,
  misfireSpans,
  showMisfire,
  scaleMode,
}: CombinedChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // Fill the viewport below whatever is rendered above the chart (header + toolbar).
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const applyHeight = () => {
      const top = wrapper.getBoundingClientRect().top + window.scrollY;
      wrapper.style.height = `${Math.max(320, window.innerHeight - top - 24)}px`;
    };

    applyHeight();
    window.addEventListener('resize', applyHeight);
    return () => window.removeEventListener('resize', applyHeight);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const normalized = scaleMode === 'normalized';
    const markAreaData = showMisfire
      ? misfireSpans.map((span) => [{ xAxis: span.startTime }, { xAxis: span.endTime }])
      : [];

    const series = columns.map((column, index) => {
      const color = seriesColor(index);
      const raw = valuesByKey[column.key] ?? [];

      let min = Infinity;
      let max = -Infinity;
      for (const value of raw) {
        if (value == null || !Number.isFinite(value)) continue;
        if (value < min) min = value;
        if (value > max) max = value;
      }
      const hasRange = Number.isFinite(min) && Number.isFinite(max) && max !== min;

      // data: [time, plotted value, raw value] — the raw value is only used by the tooltip.
      const data = times.map((t, i) => {
        const value = raw[i] ?? null;
        if (value == null || !Number.isFinite(value)) return [t, null, null];
        if (!normalized) return [t, value, value];
        return [t, hasRange ? ((value - min) / (max - min)) * 100 : 50, value];
      });

      return {
        name: column.unit ? `${column.label} (${column.unit})` : column.label,
        type: 'line' as const,
        showSymbol: false,
        smooth: true,
        sampling: 'lttb',
        lineStyle: { width: 1.4, color },
        itemStyle: { color },
        emphasis: { focus: 'series' as const },
        data,
        markArea:
          index === 0 && markAreaData.length
            ? {
                silent: true,
                itemStyle: { color: THEME.misfireArea, borderColor: THEME.misfireBorder, borderWidth: 1 },
                label: { show: false },
                data: markAreaData,
              }
            : undefined,
      };
    });

    chart.setOption(
      {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: FONT_FAMILY, color: THEME.textMuted },
        animation: false,
        legend: {
          type: 'scroll',
          top: 8,
          left: 12,
          right: 12,
          itemGap: 14,
          itemWidth: 14,
          itemHeight: 8,
          textStyle: { color: THEME.text, fontFamily: FONT_FAMILY, fontSize: 11 },
          inactiveColor: THEME.textMuted,
          pageTextStyle: { color: THEME.textMuted },
          pageIconColor: THEME.text,
          pageIconInactiveColor: THEME.border,
        },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: THEME.tooltipBg,
          borderColor: THEME.border,
          borderWidth: 1,
          textStyle: { fontFamily: FONT_FAMILY, fontSize: 12, color: THEME.text },
          axisPointer: {
            type: 'line',
            animation: false,
            snap: true,
            lineStyle: { color: THEME.axisPointer, width: 1, type: 'dashed' },
            label: {
              backgroundColor: THEME.axisPointerLabelBg,
              borderColor: THEME.border,
              borderWidth: 1,
              color: THEME.text,
              fontFamily: FONT_FAMILY,
              fontSize: 11,
              formatter: (params: { axisDimension: string; value: number | string }) =>
                params.axisDimension === 'x'
                  ? formatSeconds(Number(params.value))
                  : Number(params.value).toFixed(2),
            },
          },
          formatter: (params: TooltipParam[]) => {
            if (!params.length) return '';
            const rows = params
              .map((p) => {
                const value = p.value?.[2];
                const text = value == null ? '—' : Number(value).toFixed(2);
                return `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
                  <span>${p.marker}${p.seriesName}</span><strong>${text}</strong>
                </div>`;
              })
              .join('');
            return `<div style="margin-bottom:4px">${formatSeconds(params[0].axisValue)}</div>${rows}`;
          },
        },
        grid: { left: normalized ? 48 : 64, right: 24, top: 56, bottom: 56 },
        xAxis: {
          type: 'value',
          min: 'dataMin',
          max: 'dataMax',
          axisLine: { lineStyle: { color: THEME.border } },
          axisTick: { show: false },
          axisLabel: {
            color: THEME.textMuted,
            fontFamily: FONT_FAMILY,
            fontSize: 11,
            formatter: (value: number) => formatSeconds(value),
          },
          splitLine: { show: true, lineStyle: { color: THEME.gridLine, type: 'dashed' } },
          axisPointer: { animation: false },
        },
        yAxis: {
          type: 'value',
          scale: !normalized,
          min: normalized ? 0 : undefined,
          max: normalized ? 100 : undefined,
          name: normalized ? '% of each field\u2019s range' : undefined,
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { color: THEME.textMuted, fontFamily: FONT_FAMILY, fontSize: 11, align: 'left' },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: THEME.textMuted,
            fontFamily: FONT_FAMILY,
            fontSize: 11,
            formatter: (value: number) => (normalized ? `${value}%` : String(value)),
          },
          splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
          axisPointer: { show: false },
        },
        dataZoom: [
          { type: 'inside', filterMode: 'none' },
          {
            type: 'slider',
            height: 20,
            bottom: 12,
            filterMode: 'none',
            backgroundColor: THEME.sliderBg,
            borderColor: THEME.border,
            fillerColor: THEME.sliderFiller,
            handleStyle: { color: THEME.sliderHandle, borderColor: THEME.border },
            moveHandleStyle: { color: THEME.sliderHandle },
            showDataShadow: false,
            textStyle: { color: THEME.textMuted, fontFamily: FONT_FAMILY, fontSize: 10 },
            labelFormatter: (value: number) => formatSeconds(value),
          },
        ],
        series,
      },
      { notMerge: true },
    );
  }, [columns, times, valuesByKey, misfireSpans, showMisfire, scaleMode]);

  return (
    <div className="combined-chart" ref={wrapperRef}>
      <div className="combined-chart__canvas" ref={containerRef} />
    </div>
  );
}
