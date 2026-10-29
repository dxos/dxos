//
// Copyright 2026 DXOS.org
//

//
// The field a background draws under the scene: in scene space the grid pattern, colour washes and edge fade, so they
// pan and zoom with the drawing; in screen space the canvas fill and the grain, which must stay one pixel per screen
// pixel to read as texture rather than blur.
//

import React, { useEffect, useId, useState } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Background, type Bounds, type LookTone, MAJOR_GRID_RATIO } from '../../model/index.ts';
import { BACKGROUND_FILLS, GRID_CLASSES, WASH_TEXT } from '../../utils/index.ts';

/** Scene px the field reaches beyond the scene's bounds. */
export const BACKGROUND_PAD = 240;

/** A wash's radius, as a fraction of the field, when it sets none. */
const WASH_RADIUS = 0.75;

/** Side of the grain tile in screen pixels. */
const NOISE_SIZE = 128;

/**
 * Gradient stops falling from `strength` to nothing along a smoothstep curve from `start` (0 to 1) outward, many of them,
 * so a fade has no straight segments whose ends show as rings.
 */
export const easedStops = (strength: number, start = 0): { offset: number; opacity: number }[] =>
  Array.from({ length: 9 }, (_, index) => {
    const t = index / 8;
    const fall = t * t * (3 - 2 * t);
    return { offset: start + (1 - start) * t, opacity: strength * (1 - fall) };
  });

/**
 * A tile of random noise as a data URL, each pixel at `alpha` (0 to 1): gray, or `warm` like paper fibre. Drawn once on
 * a canvas in the browser; undefined until then, where there is no canvas, or when `alpha` is 0.
 */
export const useNoise = (alpha: number, hue: 'neutral' | 'warm' = 'neutral'): string | undefined => {
  const [noise, setNoise] = useState<string>();
  useEffect(() => {
    if (alpha <= 0) {
      setNoise(undefined);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = NOISE_SIZE;
    canvas.height = NOISE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const image = context.createImageData(NOISE_SIZE, NOISE_SIZE);
    const warm = hue === 'warm';
    for (let index = 0; index < image.data.length; index += 4) {
      const value = Math.floor(Math.random() * 256);
      image.data[index] = value;
      // Warm fibre leans brown: less green and less blue than red.
      image.data[index + 1] = warm ? Math.floor(value * 0.9) : value;
      image.data[index + 2] = warm ? Math.floor(value * 0.72) : value;
      image.data[index + 3] = Math.round(alpha * 255);
    }
    context.putImageData(image, 0, 0);
    setNoise(canvas.toDataURL());
  }, [alpha, hue]);
  return noise;
};

type GridPatternProps = { id: string; grid: Background['grid']; minor: number; tone: LookTone };

/** A pattern of the grid, tiled from the scene's origin so it lines up with the canvas's own snap grid. */
const GridPattern = ({ id, grid, minor, tone }: GridPatternProps) => {
  const classes = GRID_CLASSES[tone];
  const major = minor * MAJOR_GRID_RATIO;
  switch (grid) {
    case 'dots':
      // Offset by half a cell so each dot sits on a grid point rather than being cut at the tile's corner.
      return (
        <pattern id={id} x={-minor / 2} y={-minor / 2} width={minor} height={minor} patternUnits='userSpaceOnUse'>
          <circle cx={minor / 2} cy={minor / 2} r={1} className={classes.dots} />
        </pattern>
      );
    case 'lines':
      return (
        <pattern id={id} width={major} height={major} patternUnits='userSpaceOnUse'>
          <g className={classes.minor} strokeWidth={1}>
            {Array.from({ length: MAJOR_GRID_RATIO }, (_, index) => (
              <g key={index}>
                <line x1={index * minor} y1={0} x2={index * minor} y2={major} />
                <line x1={0} y1={index * minor} x2={major} y2={index * minor} />
              </g>
            ))}
          </g>
          <g className={classes.major} strokeWidth={1}>
            <line x1={0} y1={0} x2={0} y2={major} />
            <line x1={0} y1={0} x2={major} y2={0} />
          </g>
        </pattern>
      );
    case 'none':
      return null;
  }
};

/** Whether a background draws anything in scene space: a grid or a wash. */
export const drawsField = (background: Background): boolean =>
  background.grid !== 'none' || background.washes.length > 0;

export type BackgroundFieldProps = {
  background: Background;
  tone: LookTone;
  /** The field in scene coordinates: the scene's bounds padded, and with no fade the visible viewport too. */
  field: Bounds;
  /** Minor grid spacing in scene px. */
  grid: number;
  /** Fades the grid out, while the camera zooms: its pattern shimmers as it is resampled at each step. */
  gridHidden?: boolean;
};

/**
 * The scene-space part of a background: the washes, then the grid over them, all faded out towards the field's edges
 * when the background asks for it. Draws nothing for a background with neither grid nor washes.
 */
export const BackgroundField = ({ background, tone, field, grid, gridHidden = false }: BackgroundFieldProps) => {
  // `useId` answers colons, which a `url(#...)` reference cannot hold.
  const id = useId().replace(/:/g, '');
  if (!drawsField(background)) {
    return null;
  }
  return (
    <svg className='absolute overflow-visible pointer-events-none' width={1} height={1} data-testid='scene-background'>
      <g mask={background.fade ? `url(#${id}-fade)` : undefined}>
        <defs>
          <GridPattern id={`${id}-grid`} grid={background.grid} minor={grid} tone={tone} />
          {background.fade && (
            <>
              <radialGradient id={`${id}-fade-gradient`} r={0.5}>
                {easedStops(1, 0.3).map(({ offset, opacity }) => (
                  <stop key={offset} offset={offset} stopColor='white' stopOpacity={opacity} />
                ))}
              </radialGradient>
              <mask id={`${id}-fade`} maskUnits='userSpaceOnUse' {...field}>
                <rect {...field} fill={`url(#${id}-fade-gradient)`} />
              </mask>
            </>
          )}
        </defs>
        {background.washes.map((wash, index) => (
          <g key={index} className={WASH_TEXT[wash.hue]}>
            <defs>
              <radialGradient id={`${id}-wash-${index}`} cx={wash.x} cy={wash.y} r={wash.radius ?? WASH_RADIUS}>
                {easedStops(wash.strength).map(({ offset, opacity }) => (
                  <stop key={offset} offset={offset} stopColor='currentColor' stopOpacity={opacity} />
                ))}
              </radialGradient>
            </defs>
            <rect {...field} fill={`url(#${id}-wash-${index})`} />
          </g>
        ))}
        {background.grid !== 'none' && (
          <rect
            {...field}
            fill={`url(#${id}-grid)`}
            className='transition-opacity duration-300'
            style={{ opacity: gridHidden ? 0 : 1 }}
          />
        )}
      </g>
    </svg>
  );
};

/** The canvas fill a background asks for, screen-wide under the scene; nothing for the theme's base surface. */
export const BackgroundFill = ({ background }: { background: Background }) => {
  const fill = BACKGROUND_FILLS[background.surface];
  return fill ? <div className={mx('dx-cover pointer-events-none', fill)} data-testid='scene-background-fill' /> : null;
};

/**
 * Screen-space grain over the whole view, one noise pixel per screen pixel: it breaks up the steps a dim gradient makes,
 * which read as bands, and gives paper its fibre. In the scene it would be resampled with the zoom and smoothed away.
 * `offset` (the camera's translation in screen pixels) shifts the tile, so the grain travels with a pan as the scene
 * does, while staying one pixel per screen pixel whatever the zoom.
 */
export const GrainOverlay = ({ background, offset }: { background: Background; offset?: { x: number; y: number } }) => {
  const noise = useNoise(background.grain, background.grainHue);
  return noise ? (
    <div
      className='dx-cover pointer-events-none'
      style={{
        backgroundImage: `url(${noise})`,
        // Whole pixels, so the tile is never resampled between them and the grain stays crisp.
        backgroundPosition: offset ? `${Math.round(offset.x)}px ${Math.round(offset.y)}px` : undefined,
      }}
      data-testid='scene-background-grain'
    />
  ) : null;
};

/** The field a background covers: the scene's bounds padded, joined with the visible viewport unless it fades. */
export const backgroundField = (background: Background, bounds: Bounds, viewport: Bounds | undefined): Bounds => {
  const padded = {
    x: bounds.x - BACKGROUND_PAD,
    y: bounds.y - BACKGROUND_PAD,
    width: bounds.width + BACKGROUND_PAD * 2,
    height: bounds.height + BACKGROUND_PAD * 2,
  };
  if (background.fade || !viewport) {
    return padded;
  }
  const left = Math.min(padded.x, viewport.x);
  const top = Math.min(padded.y, viewport.y);
  const right = Math.max(padded.x + padded.width, viewport.x + viewport.width);
  const bottom = Math.max(padded.y + padded.height, viewport.y + viewport.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
};
