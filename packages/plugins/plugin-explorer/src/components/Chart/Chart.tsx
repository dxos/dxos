//
// Copyright 2023 DXOS.org
//

import * as Plot from '@observablehq/plot';
import { type DotOptions } from '@observablehq/plot';
import React, { useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type Accessor, type Point, createAdapter } from '../plot';

const defaultOptions: DotOptions = {
  r: 4,
  stroke: 'gray',
  fill: 'gray',
  fillOpacity: 0.2,
};

export type CharProps = {
  items?: any[];
  accessor?: Accessor<Point>;
  options?: DotOptions;
};

export const Chart = ({ items = [], accessor, options = defaultOptions }: CharProps) => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    const plot = Plot.plot({
      grid: true,
      width,
      height,
      style: {
        background: 'transparent',
      },
      marks: [
        Plot.frame(),
        Plot.dot(items, {
          x: createAdapter('x', accessor),
          y: createAdapter('y', accessor),
          ...options,
        }),
      ],
    });

    containerRef.current!.append(plot);
    return () => plot?.remove();
  }, [items, width, height]);

  return <div ref={containerRef} className='grow' />;
};
