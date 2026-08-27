import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { LogColumn, MisfireSpan } from '../types';
import { CHART_GROUP_ID, FONT_FAMILY, THEME, formatSeconds, seriesColor } from '../chartTheme';

interface LogChartProps {
  column: LogColumn;
  colorIndex: number;
  times: number[];
  values: (number | null)[];
  misfireSpans: MisfireSpan[];
  showMisfire: boolean;
  zoomRange?: MisfireSpan;
}

export function LogChart({ column, colorIndex, times, values, misfireSpans, showMisfire, zoomRange }: LogChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = echarts.init(container, undefined, { renderer: 'canvas' });
    // Shared group id lets echarts.connect sync zoom/tooltip across the stacked charts.
    chart.group = CHART_GROUP_ID;
    chartRef.current = chart;
    echarts.connect(CHART_GROUP_ID);

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

    const color = seriesColor(colorIndex);
    const markAreaData = showMisfire
      ? misfireSpans.map((span) => [{ xAxis: span.startTime }, { xAxis: span.endTime }])
      : [];

    chart.setOption(
      {
        backgroundColor: 'transparent',
        textStyle: { fontFamily: FONT_FAMILY, color: THEME.textMuted },
        animation: false,
        title: {
          text: column.label,
          subtext: column.unit,
          left: 12,
          top: 8,
          textStyle: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: THEME.text },
          subtextStyle: { fontFamily: FONT_FAMILY, fontSize: 11, color: THEME.textMuted },
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: THEME.tooltipBg,
          borderColor: THEME.border,
          borderWidth: 1,
          textStyle: { fontFamily: FONT_FAMILY, fontSize: 12, color: THEME.text },
          axisPointer: {
            type: 'cross',
            animation: false,
            snap: true,
            lineStyle: { color: THEME.axisPointer, width: 1, type: 'dashed' },
            crossStyle: { color: THEME.axisPointer, width: 1, type: 'dashed' },
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
          valueFormatter: (value: unknown) => (value == null ? '—' : Number(value).toFixed(2)),
        },
        grid: { left: 64, right: 24, top: 48, bottom: 56 },
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
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: THEME.textMuted, fontFamily: FONT_FAMILY, fontSize: 11 },
          splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
          axisPointer: { animation: false },
        },
        dataZoom: [
          { type: 'inside', filterMode: 'none', startValue: zoomRange?.startTime, endValue: zoomRange?.endTime },
          {
            type: 'slider',
            height: 20,
            bottom: 12,
            filterMode: 'none',
            startValue: zoomRange?.startTime,
            endValue: zoomRange?.endTime,
            backgroundColor: THEME.sliderBg,
            borderColor: THEME.border,
            fillerColor: THEME.sliderFiller,
            handleStyle: { color: THEME.sliderHandle, borderColor: THEME.border },
            moveHandleStyle: { color: THEME.sliderHandle },
            dataBackground: {
              lineStyle: { color: THEME.textMuted, opacity: 0.5 },
              areaStyle: { color: THEME.textMuted, opacity: 0.15 },
            },
            selectedDataBackground: {
              lineStyle: { color },
              areaStyle: { color, opacity: 0.2 },
            },
            textStyle: { color: THEME.textMuted, fontFamily: FONT_FAMILY, fontSize: 10 },
            labelFormatter: (value: number) => formatSeconds(value),
          },
        ],
        series: [
          {
            name: column.unit ? `${column.label} (${column.unit})` : column.label,
            type: 'line',
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            lineStyle: { width: 1.6, color },
            itemStyle: { color },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: echarts.color.modifyAlpha(color, 0.2) },
                { offset: 1, color: echarts.color.modifyAlpha(color, 0) },
              ]),
            },
            emphasis: { disabled: true },
            data: times.map((t, i) => [t, values[i]]),
            markArea: markAreaData.length
              ? {
                  silent: true,
                  itemStyle: { color: THEME.misfireArea, borderColor: THEME.misfireBorder, borderWidth: 1 },
                  label: { show: false },
                  data: markAreaData,
                }
              : undefined,
          },
        ],
      },
      { notMerge: true },
    );
  }, [column, colorIndex, times, values, misfireSpans, showMisfire, zoomRange]);

  return <div className="log-chart" ref={containerRef} />;
}
