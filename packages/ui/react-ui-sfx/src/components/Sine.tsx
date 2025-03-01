//
// Copyright 2025 DXOS.org
//

import { line, curveNatural } from 'd3';
import React, { useRef, useEffect, useCallback } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type SineProps = ThemedClassName;

export const Sine = ({ classNames }: SineProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const n = 30;
  const dx = width / (n - 1);
  const dt = (4 * Math.PI * 2) / n;

  const phase = useRef(0);
  const handleAnimationFrame = useCallback(
    (time: number) => {
      let amplitude = height / 2;
      const points: [number, number][] = Array.from({ length: n }, (_, i) => {
        amplitude *= 0.9;
        return [-width / 2 + i * dx, Math.sin(phase.current + i * dt) * amplitude];
      });

      const path = lineGenerator(points);
      if (path) {
        pathRef.current!.setAttribute('d', path);
      }

      phase.current -= 0.1;
      requestAnimationFrame(handleAnimationFrame);
    },
    [width, height],
  );

  useEffect(() => {
    const t = requestAnimationFrame(handleAnimationFrame);
    return () => cancelAnimationFrame(t);
  }, [handleAnimationFrame]);

  return (
    <div ref={ref} className={mx(classNames)}>
      <svg ref={svgRef} className='w-full h-full' viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}>
        <path ref={pathRef} fill='none' stroke='currentColor' strokeWidth='1' />
      </svg>
    </div>
  );
};

// Create D3 line generator with natural curve interpolation.
const lineGenerator = line<[number, number]>()
  .x((d) => d[0])
  .y((d) => d[1])
  .curve(curveNatural);
