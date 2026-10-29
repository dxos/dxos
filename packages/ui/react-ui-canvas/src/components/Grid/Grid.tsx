//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, useId, useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { type Bounds, type Point } from '../../model/index.ts';
import { easedStops } from '../Background/index.ts';

const gridRatios = [1 / 4, 1, 4, 16];

const defaultGridSize = 16;
const defaultOffset: Point = { x: 0, y: 0 };
const defaultRange = [defaultGridSize, 128] as const;

const createId = (parent: string, grid: number) => `dx-canvas-grid-${parent}-${grid}`;

/**
 * A level's line opacity from its on-screen spacing alone: faint at the finest drawn spacing, a step
 * darker per fourfold. A level then fades in as the view zooms rather than popping, and a scene swap
 * that keeps every spacing (drilling through a grid-aligned portal) keeps every line as it was. The
 * step is small and the ceiling low: the grid is a guide under the diagram, so the coarse levels in
 * particular must not read as content.
 */
const levelOpacity = (size: number, min: number) => Math.min(0.12, 0.04 + (0.02 * Math.log(size / min)) / Math.log(4));

/** A dot level fades in over its first doubling past the finest drawn spacing, so a level arriving with the zoom does not pop. */
const dotOpacity = (size: number, min: number) => Math.min(1, (size - min) / min);

export type GridProps = Util.ThemedClassName<{
  size?: number;
  scale?: number;
  offset?: Point;
  showAxes?: boolean;
  /** Grid levels as multiples of `size`, finest first. */
  ratios?: readonly number[];
  /** On-screen cell size (px) outside which a level is not drawn. */
  range?: readonly [min: number, max: number];
  /** Crossing lines, or a dot at each grid point. */
  variant?: 'lines' | 'dots';
  /** The dots' fill, as the stroke colours the lines. */
  dotsClassName?: string;
  /** In screen px, the field the grid fades out towards the edges of, as a background with `fade` asks. */
  fade?: Bounds;
  /** The whole grid's opacity, for crossfading it with another. */
  opacity?: number;
}>;

/** Multi-level grid in screen space, fed the camera's scale and offset. */
export const GridComponent = forwardRef<SVGSVGElement, GridProps>(
  (
    {
      size: gridSize = defaultGridSize,
      scale = 1,
      offset = defaultOffset,
      showAxes = true,
      ratios = gridRatios,
      range = defaultRange,
      variant = 'lines',
      dotsClassName = 'fill-neutral-500',
      fade,
      opacity,
      classNames,
    },
    forwardedRef,
  ) => {
    const svgRef = Hooks.useForwardedRef(forwardedRef);
    const { width = 0, height = 0 } = svgRef.current?.getBoundingClientRect() ?? {};

    const instanceId = useId();
    const [min, max] = range;
    const grids = useMemo(
      () =>
        ratios
          .map((ratio) => ({ id: ratio, size: ratio * gridSize * scale }))
          .filter(({ size }) => size >= min && size <= max),
      [ratios, gridSize, scale, min, max],
    );

    return (
      <svg
        data-testid='dx-canvas-grid'
        ref={svgRef}
        opacity={opacity}
        // `dx-cover` (absolute inset-0) does not stretch a replaced <svg> element - without an explicit
        // size it falls back to the intrinsic 300x150, clipping the 100%-sized grid rects. Force full size.
        className={mx(
          'dx-cover w-full h-full pointer-events-none touch-none select-none',
          'stroke-neutral-500',
          classNames,
        )}
      >
        {/* NOTE: The pattern is offset so that the middle of the pattern aligns with the grid. */}
        <defs>
          {fade && (
            <>
              <radialGradient id={`${createId(instanceId, 0)}-fade-gradient`} r={0.5}>
                {easedStops(1, 0.3).map(({ offset, opacity }) => (
                  <stop key={offset} offset={offset} stopColor='white' stopOpacity={opacity} />
                ))}
              </radialGradient>
              <mask id={`${createId(instanceId, 0)}-fade`} maskUnits='userSpaceOnUse' {...fade}>
                <rect {...fade} fill={`url(#${createId(instanceId, 0)}-fade-gradient)`} />
              </mask>
            </>
          )}
          {grids.map(({ id, size }) => (
            <GridPattern
              key={id}
              id={createId(instanceId, id)}
              offset={offset}
              size={size}
              variant={variant}
              dotsClassName={dotsClassName}
            />
          ))}
        </defs>
        {showAxes && (
          <>
            <line x1={0} y1={offset.y} x2={width} y2={offset.y} className='stroke-neutral-500 opacity-40' />
            <line x1={offset.x} y1={0} x2={offset.x} y2={height} className='stroke-neutral-500 opacity-40' />
          </>
        )}
        <g mask={fade ? `url(#${createId(instanceId, 0)}-fade)` : undefined}>
          {grids.map(({ id, size }) => (
            <rect
              key={id}
              opacity={variant === 'dots' ? dotOpacity(size, min) : levelOpacity(size, min)}
              fill={`url(#${createId(instanceId, id)})`}
              // The svg's stroke is for the pattern's lines; on the level's rect it would outline the whole view.
              stroke='none'
              width='100%'
              height='100%'
            />
          ))}
        </g>
      </svg>
    );
  },
);

GridComponent.displayName = 'GridComponent';

type GridPatternProps = Pick<GridProps, 'variant' | 'dotsClassName'> & { id: string; size: number; offset: Point };

/** One grid level as an SVG pattern of crossing lines (or a dot where they cross), offset so a line sits on the origin. */
const GridPattern = ({ id, size, offset, variant, dotsClassName }: GridPatternProps) => (
  <pattern
    id={id}
    x={(size / 2 + offset.x) % size}
    y={(size / 2 + offset.y) % size}
    width={size}
    height={size}
    patternUnits='userSpaceOnUse'
  >
    {variant === 'dots' ? (
      <circle cx={size / 2} cy={size / 2} r={1} stroke='none' className={dotsClassName} />
    ) : (
      <>
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} />
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} />
      </>
    )}
  </pattern>
);
