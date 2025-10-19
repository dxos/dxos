//
// Copyright 2025 DXOS.org
//

import { curveNatural, line, select } from 'd3';
import React, { useCallback, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type SineProps = ThemedClassName;

const phaser = (min: number, max: number, period: number) => {
  if (min === max) {
    return () => min;
  }

  const mid = (min + max) / 2;
  const range = (max - min) / 2;
  return (t: number) => Math.floor(mid + Math.sin(t * period) * range);
};

// TODO(burdon): Create sliders.
export const Sine = ({ classNames }: SineProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector();
  const svgRef = useRef<SVGSVGElement>(null);

  // Options.
  const period = 1 / 200;
  const numWaves = 3;
  // const numPointsRange = [5, 7, 10, 15, 30];
  const huePhaser = phaser(20, 50, 1 / 1000);
  const lineGenerator = line<[number, number]>()
    .x((d) => d[0])
    .y((d) => d[1])
    .curve(curveNatural);
  // .curve(curveLinear);
  // .curve(curveStep);

  const handleAnimationFrame = useCallback(
    (time: number) => {
      // const n = Math.floor(time / 2_000) % numPointsRange.length;
      // const numPoints = numPointsRange[n];
      const numPoints = 7;

      const phase = time * period;
      const dx = width / (numPoints - 1);
      const waves = Array.from({ length: numWaves }, (_, i) => {
        const maxAmplitude = height / (i + 3);

        const dt = ((i + 2) * 2 * Math.PI * 2) / numPoints;
        const points: [number, number][] = Array.from({ length: numPoints }, (_, i) => {
          const amplitude = maxAmplitude * Math.sin((i * Math.PI) / (numPoints - 1));
          const x = -width / 2 + i * dx;
          const y = Math.sin(phase + i * dt) * amplitude;
          return [x, y];
        });

        const baseHue = huePhaser(time);
        return { path: lineGenerator(points)!, color: `hsl(${baseHue + i * 10}, 100%, 50%)` };
      });

      select(svgRef.current)
        .selectAll('path')
        .data(waves)
        .join('path')
        .attr('d', (d) => d.path)
        .attr('fill', 'none')
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', 0.5);

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
      <svg ref={svgRef} className='w-full h-full' viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`} />
    </div>
  );
};
