//
// Copyright 2025 DXOS.org
//

import { curveCatmullRom, line, scaleLinear } from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useAudioStream } from '../../hooks';

export type Point = { x: number; y: number };

const defaultRange: [number, number] = [0, 256];

const curveGenerator = line<Point>()
  // .curve(curveBasis)
  // .curve(curveBundle)
  .curve(curveCatmullRom.alpha(0.5))
  .x((d) => d.x)
  .y((d) => d.y);

type GraphProps = {
  size?: number;
  n?: number;
  range?: [number, number];
  data?: number[];
  grid?: boolean;
  trail?: number;
};

const Graph = ({ size = 64, n = 10, range = defaultRange, data = [], grid, trail = 8 }: GraphProps) => {
  const scaleX = useMemo(() => scaleLinear([0, n - 1], [-size / 2, size / 2]), [size, n]);
  const scaleY = useMemo(() => scaleLinear(range, [size / 2, -size / 2]), [size, range]);

  const i = useRef(0);
  const paths = useRef<string[]>([]);
  const points = data.map((value, i) => ({ x: scaleX(i), y: scaleY(value) }));
  const path = curveGenerator(points) ?? '';
  if (i.current % 10 === 0) {
    paths.current.splice(0, 0, path);
    paths.current.length = trail;
  } else {
    paths.current.splice(0, 1, path);
  }
  i.current++;

  const gridSize = 8;
  return (
    <div
      className='flex overflow-hidden border-2 border-primary-500 rounded-[20%]'
      style={{ width: size, height: size }}
    >
      <svg className='overflow-visible' style={{ transform: `translate(${size / 2}px, ${size / 2}px)` }}>
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
            <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={'url(#osc-grid)'} />
          </>
        )}
        {paths.current.map((path, i) => (
          <path
            key={i}
            d={path}
            className='fill-none stroke-primary-500'
            style={{ opacity: 1 - Math.log10(i + 1), strokeWidth: i === 0 ? 2 : 1 }}
          />
        ))}
      </svg>
    </div>
  );
};

export type OscilloscopeProps = Pick<GraphProps, 'size'> & { active?: boolean };

// TODO(burdon): Should pass in audio stream.
export const Oscilloscope = ({ active, size }: OscilloscopeProps) => {
  const { getData } = useAudioStream(true);
  const [data, setData] = useState<number[]>([]);
  useEffect(() => {
    if (!active) {
      return;
    }

    const sample = () => {
      const data = Array.from(getData() ?? []).slice(4); // Cut off.
      setData([0, 0, 0, 0, ...data.map((v) => v), 0, 0, 0, 0]);
    };

    requestAnimationFrame(sample);
    const t = setInterval(sample, 1_000 / 50);
    return () => clearInterval(t);
  }, [active]);

  return <Graph size={size} data={data} range={[-150, 356]} n={data.length} grid />;
};
