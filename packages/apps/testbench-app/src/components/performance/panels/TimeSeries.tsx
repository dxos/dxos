//
// Copyright 2024 DXOS.org
//

import { ClockCountdown } from '@phosphor-icons/react';
import { Chart, registerables } from 'chart.js';
import ChartStreaming from 'chartjs-plugin-streaming';
import React, { createRef, useEffect, useState } from 'react';
import 'chartjs-adapter-luxon';

import { type CustomPanelProps, Panel } from '../util';

Chart.register(...registerables);
Chart.register(ChartStreaming);

// TODO(burdon): Add significant events to TS (e.g., ECHO/MESH events).
export const TimeSeries = (props: CustomPanelProps<{}>) => {
  const canvasRef = createRef<HTMLCanvasElement>();
  const [chart, setChart] = useState<Chart>();
  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    // Utils: https://www.chartjs.org/docs/latest/samples/utils.html
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        // https://nagix.github.io/chartjs-plugin-streaming/master/samples/charts/line-horizontal.html
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
        layout: {
          padding: {
            top: 10,
          },
        },
        scales: {
          x: {
            type: 'realtime',
            // alignToPixels: true,
            realtime: {
              duration: 30_000,
              ttl: undefined,
            },
          },
          y: {
            min: 0,
            max: 125,
            ticks: {
              stepSize: 30,
              includeBounds: false,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          // https://nagix.github.io/chartjs-plugin-streaming/master/guide/options.html#options
          // https://nagix.github.io/chartjs-plugin-streaming/master/guide/data-feed-models.html#push-model-listening-based
          streaming: {
            frameRate: 30,
          },
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

        // Manual decimation since chart.js can't do this for realtime data.
        // https://www.chartjs.org/docs/latest/configuration/decimation.html
        const t = Date.now();
        if (!last || t - last > 500) {
          chart.data.datasets[0].data.push({ x: t, y: times.length });
          last = t;
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
    <Panel {...props} icon={ClockCountdown} title='Time Series' padding={false}>
      <div className='relative w-full h-[160px]'>
        <canvas ref={canvasRef} />
      </div>
    </Panel>
  );
};

// class MovingAverage {
//   values: number[] = [];
//   sum = 0;
//
//   constructor(private readonly size: number) {}
//
//   add(value: number) {
//     this.values.push(value);
//     this.sum += value;
//     if (this.values.length > this.size) {
//       this.sum -= this.values.shift() ?? 0;
//     }
//     return this.getAverage();
//   }
//
//   getAverage() {
//     return this.values.length === 0 ? 0 : this.sum / this.values.length;
//   }
// }
