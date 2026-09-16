//
// Copyright 2026 DXOS.org
//

import 'chartjs-adapter-luxon';

import ChartStreaming from '@robloche/chartjs-plugin-streaming';
import { Chart, registerables } from 'chart.js';
import React, { useEffect, useRef, useState } from 'react';

import { STAT_CARD_HUES, StatCard } from '../../../components/index.ts';

Chart.register(...registerables);
Chart.register(ChartStreaming);

/** Samples per second pushed to the chart; the frame counter itself runs every frame. */
const SAMPLE_RATE = 2;

/** Frames per second over the last 30s, sampled from `requestAnimationFrame`. */
export const TimeSeriesCard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chart, setChart] = useState<Chart>();
  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    // https://www.chartjs.org/docs/latest/configuration
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        datasets: [
          {
            indexAxis: 'x',
            fill: false,
            borderColor: 'rgba(200, 0, 0, 0.5)',
            pointRadius: 0,
            tension: 0.2,
            data: [Date.now()],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: { top: 10 } },
        scales: {
          x: { type: 'realtime', realtime: { duration: 30_000, ttl: undefined } },
          y: { min: 0, max: 125, ticks: { stepSize: 30, includeBounds: false } },
        },
        plugins: {
          legend: { display: false },
          streaming: { frameRate: 30 },
        },
      },
    });

    setChart(chart);
    return () => chart.destroy();
  }, []);

  useEffect(() => {
    if (!chart) {
      return;
    }

    let last = 0;
    let running = true;
    const times: number[] = [];
    const refreshLoop = () => {
      if (!running) {
        return;
      }

      window.requestAnimationFrame(() => {
        const now = performance.now();
        while (times.length > 0 && times[0] <= now - 1_000) {
          times.shift();
        }
        times.push(now);

        // Manual decimation: chart.js cannot decimate realtime data.
        const timestamp = Date.now();
        if (!last || timestamp - last > 1_000 / SAMPLE_RATE) {
          chart.data.datasets[0].data.push({ x: timestamp, y: times.length });
          last = timestamp;
        }

        refreshLoop();
      });
    };

    refreshLoop();
    return () => {
      running = false;
    };
  }, [chart]);

  return (
    <StatCard.Root>
      <StatCard.Header icon='ph--clock-countdown--regular' hue={STAT_CARD_HUES.ui} title='Frame rate' />
      <StatCard.Content classNames='relative h-[160px]'>
        <canvas ref={canvasRef} />
      </StatCard.Content>
    </StatCard.Root>
  );
};

TimeSeriesCard.displayName = 'TimeSeriesCard';

export default TimeSeriesCard;
