//
// Copyright 2025 DXOS.org
//

import { type Point } from '@antv/layout';
import * as d3 from 'd3';
import React, { useEffect, useMemo, useState } from 'react';

import { useAudioStream } from './useAudioStream';

export type WaveformProps = {
  size?: number;
  n?: number;
  range?: [number, number];
  data?: number[];
};

const defaultRange: [number, number] = [0, 256];

const curveGenerator = d3
  .line<Point>()
  // .curve(d3.curveBasis)
  // .curve(d3.curveBundle)
  .curve(d3.curveCatmullRom.alpha(0.5))
  .x((d) => d.x)
  .y((d) => d.y);

export const Waveform = ({ size = 64, n = 10, range = defaultRange, data = [] }: WaveformProps) => {
  const scaleX = useMemo(() => d3.scaleLinear([0, n - 1], [-size / 2, size / 2]), [size]);
  const scaleY = useMemo(() => d3.scaleLinear(range, [size / 2, -size / 2]), [size, range]);

  const points = data.map((value, i) => ({ x: scaleX(i), y: scaleY(value) }));
  const path = curveGenerator(points) ?? '';

  const grid = 8;
  return (
    <div className='flex overflow-hidden border border-primary-500 rounded-full' style={{ width: size, height: size }}>
      <svg className='overflow-visible' style={{ transform: `translate(${size / 2}px, ${size / 2}px)` }}>
        <defs>
          <pattern id={'osc-grid'} x={0} y={0} width={grid} height={grid} patternUnits='userSpaceOnUse'>
            <line
              x1={0}
              y1={grid / 2}
              x2={grid}
              y2={grid / 2}
              className='stroke-[0.25] stroke-neutral-500 opacity-50'
            />
            <line
              x1={grid / 2}
              y1={0}
              x2={grid / 2}
              y2={grid}
              className='stroke-[0.25] stroke-neutral-500 opacity-50'
            />
          </pattern>
        </defs>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} fill={'url(#osc-grid)'} />
        <path d={path} className='fill-none stroke-primary-500 stroke-[1px]' />
      </svg>
    </div>
  );
};

export const Oscilloscope = ({ active, size }: Pick<WaveformProps, 'size'> & { active?: boolean }) => {
  const { getData } = useAudioStream(true);
  const [data, setData] = useState<number[]>([]);
  useEffect(() => {
    const sample = () => {
      setData([0, 0, 0, 0, ...Array.from(getData() ?? []).map((v) => v), 0, 0, 0, 0]);
      if (active) {
        requestAnimationFrame(sample);
      }
    };

    if (active) {
      requestAnimationFrame(sample);
    }
  }, [active]);

  // TODO(burdon): Remove background noise.
  return <Waveform size={size} n={24} data={data} range={[-100, 356]} />;
};
