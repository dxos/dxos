//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useSvgContext } from '../../hooks';

export type FPSCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type FPSProps = ThemedClassName<{
  /** Which corner of the SVG viewport to anchor the readout to. */
  corner?: FPSCorner;
  /** Pixels of padding from the chosen corner. */
  margin?: number;
}>;

const PADDING = 8;

/**
 * Frame-rate readout — drops into an `<SVG.Root>` alongside `<SVG.Graph>` to display a
 * rolling 1-second average of the browser's repaint rate. Self-contained: runs its own
 * `requestAnimationFrame` loop, so the number reflects actual render rate independent of
 * whichever projector is driving the graph.
 *
 * Anchored to a corner of the SVG viewBox via the `<text>`'s `text-anchor` and `dy`
 * attributes — re-renders on `context.resized` so the position tracks container resizes.
 */
export const FPS = ({ classNames, corner = 'top-right', margin = PADDING }: FPSProps) => {
  const context = useSvgContext();
  const [size, setSize] = useState(context.size);
  const [fps, setFps] = useState<number | null>(null);

  // Keep `size` in sync with the SVG context so the corner anchor follows container resizes.
  useEffect(() => {
    setSize(context.size);
    return context.resized.on((ctx) => setSize(ctx.size));
  }, [context]);

  // Independent rAF loop — measures the browser's actual repaint rate, not any specific
  // projector's tick rate. Rolling 1-second window so the number is responsive but stable.
  useEffect(() => {
    let frames = 0;
    let windowStart = performance.now();
    let rafId = 0;
    const loop = (now: number) => {
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= 1000) {
        setFps((frames * 1000) / elapsed);
        frames = 0;
        windowStart = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!size) {
    return null;
  }

  // The SVG.Root viewBox is centered ([-w/2, w/2] × [-h/2, h/2]); offset from the chosen
  // corner inward by `margin` and pick the corresponding text-anchor / dominant-baseline.
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  const left = corner === 'top-left' || corner === 'bottom-left';
  const top = corner === 'top-left' || corner === 'top-right';
  const x = left ? -halfW + margin : halfW - margin;
  const y = top ? -halfH + margin : halfH - margin;
  const textAnchor = left ? 'start' : 'end';
  const dominantBaseline = top ? 'hanging' : 'alphabetic';

  return (
    <g className='dx-fps' style={{ pointerEvents: 'none' }}>
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        dominantBaseline={dominantBaseline}
        className={mx('font-mono text-xs fill-neutral-500 tabular-nums', classNames)}
      >
        {fps == null ? '— fps' : `${fps.toFixed(0)} fps`}
      </text>
    </g>
  );
};
