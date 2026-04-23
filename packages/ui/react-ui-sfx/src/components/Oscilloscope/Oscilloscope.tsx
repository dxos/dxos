//
// Copyright 2025 DXOS.org
//

import { curveCatmullRom, line, scaleLinear } from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useAudioStream } from '../../hooks';

export type Point = { x: number; y: number };

const defaultRange: [number, number] = [0, 256];

const curveGenerator = line<Point>()
  // .curve(curveBasis)
  // .curve(curveBundle)
  .curve(curveCatmullRom.alpha(0.9))
  .x((d) => d.x)
  .y((d) => d.y);

type GraphProps = ThemedClassName<{
  range?: [number, number];
  data?: number[];
  bins?: number;
  grid?: boolean;
  trail?: number;
}>;

// TODO(burdon): Radix style to separate Grid from Graph.
const Graph = ({ classNames, data = [], bins = data.length, range = defaultRange, grid, trail = 4 }: GraphProps) => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>();
  const scaleX = useMemo(() => scaleLinear([0, bins - 1], [-width / 2, width / 2]), [width, bins]);
  const scaleY = useMemo(() => scaleLinear(range, [height / 2, -height / 2]), [height, range]);

  const i = useRef(0);
  const paths = useRef<string[]>([]);

  const [, forceUpdate] = useState(0);

  // Update path trail when data changes.
  useEffect(() => {
    if (data.length === 0) {
      return;
    }

    const points = data.map((value, idx) => ({ x: scaleX(idx), y: scaleY(value) }));
    const path = curveGenerator(points) ?? '';
    if (i.current % trail === 0) {
      paths.current.splice(0, 0, path);
      paths.current.length = trail;
    } else {
      paths.current.splice(0, 1, path);
    }
    i.current++;
    forceUpdate((n) => n + 1);
  }, [data, scaleX, scaleY, trail]);

  // When data goes empty, drain the trail one path at a time.
  useEffect(() => {
    if (data.length > 0 || paths.current.length === 0) {
      return;
    }

    const t = setInterval(() => {
      paths.current.pop();
      forceUpdate((n) => n + 1);
      if (paths.current.length === 0) {
        clearInterval(t);
      }
    }, 50);
    return () => clearInterval(t);
  }, [data.length]);

  const gridSize = 8;
  return (
    <div
      ref={containerRef}
      className={mx('dx-container border rounded-md border-green-800 stroke-green-800', classNames)}
    >
      <svg className='overflow-visible' style={{ transform: `translate(${width / 2}px, ${height / 2}px)` }}>
        {grid && (
          <>
            <defs>
              <pattern id={'osc-grid'} x={0} y={0} width={gridSize} height={gridSize} patternUnits='userSpaceOnUse'>
                <line
                  x1={0}
                  y1={gridSize / 2}
                  x2={gridSize}
                  y2={gridSize / 2}
                  className='stroke-[0.25] stroke-neutral-500 opacity-50'
                />
                <line
                  x1={gridSize / 2}
                  y1={0}
                  x2={gridSize / 2}
                  y2={gridSize}
                  className='stroke-[0.25] stroke-neutral-500 opacity-50'
                />
              </pattern>
            </defs>
            <rect
              x={-width / 2}
              y={-height / 2}
              width={width}
              height={height}
              fill={'url(#osc-grid)'}
              className='stroke-none'
            />
          </>
        )}
        {paths.current.map((path, i) => (
          <path
            key={i}
            d={path}
            className='fill-none'
            style={{ opacity: 1 - Math.log10(i + 1), strokeWidth: i === 0 ? 2 : 1 }}
          />
        ))}
      </svg>
    </div>
  );
};

export type OscilloscopeMode = 'frequency' | 'waveform';

export type OscilloscopeProps = ThemedClassName<{
  active?: boolean;
  mode?: OscilloscopeMode;
  /** X-axis window as [startIndex, endIndex] into the data array. Shows all bins if omitted. */
  domain?: [number, number];
  /** Y-axis domain. Defaults to mode-appropriate range. */
  range?: [number, number];
  /** Optional AudioNode source. Falls back to microphone if not provided. */
  source?: AudioNode;
}>;

export const Oscilloscope = ({ classNames, active, mode = 'frequency', domain, range, source }: OscilloscopeProps) => {
  // Waveform needs a much larger window to capture full cycles; frequency mode uses fewer bins.
  const fftSize = mode === 'waveform' ? 2048 : 64;
  const { getData, getTimeDomainData } = useAudioStream(active, { source, fftSize });
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    if (!active) {
      setData([]);
      return;
    }

    let cancelled = false;
    const sample = () => {
      if (cancelled) {
        return;
      }

      if (mode === 'waveform') {
        const raw = Array.from(getTimeDomainData() ?? []);
        setData(raw);
      } else {
        const raw = Array.from(getData() ?? []).slice(4); // Cut off DC offset.
        setData([0, 0, ...raw]);
      }
    };

    const raf = requestAnimationFrame(sample);
    const t = setInterval(sample, 1_000 / 50);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(t);
      setData([]);
    };
  }, [active, source, mode]);

  // Frequency: 0–255 from baseline. Waveform: 0–255 centered at 128 (silence).
  const defaultRange: [number, number] = mode === 'waveform' ? [0, 255] : [-150, 356];
  const displayData = domain ? data.slice(domain[0], domain[1]) : data;

  return <Graph classNames={classNames} data={displayData} range={range ?? defaultRange} grid />;
};
