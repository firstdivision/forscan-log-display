import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { LogColumn, MisfireSpan } from '../types';

interface LogChartProps {
  column: LogColumn;
  timeLabel: string;
  times: number[];
  values: (number | null)[];
  misfireSpans: MisfireSpan[];
  showMisfire: boolean;
}

export function LogChart({ column, timeLabel, times, values, misfireSpans, showMisfire }: LogChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const markAreaData = showMisfire
      ? misfireSpans.map((span) => [{ xAxis: span.startTime }, { xAxis: span.endTime }])
      : [];

    chart.setOption({
      title: {
        text: column.unit ? `${column.label} (${column.unit})` : column.label,
        textStyle: { fontSize: 14 },
      },
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, top: 40, bottom: 40 },
      xAxis: {
        type: 'value',
        name: timeLabel,
        data: times,
      },
      yAxis: { type: 'value', scale: true },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 4 }],
      series: [
        {
          type: 'line',
          showSymbol: false,
          data: times.map((t, i) => [t, values[i]]),
          markArea: markAreaData.length
            ? {
                itemStyle: { color: 'rgba(255, 0, 0, 0.15)' },
                data: markAreaData,
              }
            : undefined,
        },
      ],
    });
  }, [column, timeLabel, times, values, misfireSpans, showMisfire]);

  return <div ref={containerRef} style={{ width: '100%', height: 320 }} />;
}
