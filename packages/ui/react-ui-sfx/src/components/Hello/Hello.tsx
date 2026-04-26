//
// Copyright 2025 DXOS.org
//

import { interpolate } from 'flubber';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import React, { useEffect, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Circle: cx=50, cy=50, r=40 expressed as four cubic-bezier arcs (handle = r · 0.5523).
const CIRCLE_PATH =
  'M50,10 C72.0914,10 90,27.9086 90,50 C90,72.0914 72.0914,90 50,90 C27.9086,90 10,72.0914 10,50 C10,27.9086 27.9086,10 50,10 Z';

/**
 * Builds an n-point star SVG path with alternating outer/inner radii around (cx, cy).
 * First vertex sits at the top (angle = -π/2) so it matches the circle's anchor at (50, 10).
 */
const buildStarPath = (cx: number, cy: number, outerR: number, innerR: number, points: number): string => {
  const cmds: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    cmds.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(3)},${y.toFixed(3)}`);
  }
  cmds.push('Z');
  return cmds.join(' ');
};

const STAR_PATH = buildStarPath(50, 50, 40, 18, 6);

export type HelloProps = ThemedClassName<{
  /** Pixel size of the rendered SVG (square). */
  size?: number;
  /** One-way morph duration in seconds. Full cycle is 2× this value. */
  duration?: number;
}>;

/**
 * Infinite circle ↔ six-point star morph.
 * Direct port of https://motion.dev/tutorials/react-path-morphing.
 */
export const Hello = ({ classNames, size = 100, duration = 2 }: HelloProps) => {
  const progress = useMotionValue(0);
  const interpolator = useMemo(() => interpolate(CIRCLE_PATH, STAR_PATH, { maxSegmentLength: 2 }), []);
  const path = useTransform(progress, (t) => interpolator(t));

  useEffect(() => {
    const controls = animate(progress, [0, 1, 0], {
      duration: duration * 2,
      ease: 'easeInOut',
      repeat: Infinity,
    });
    return () => controls.stop();
  }, [progress, duration]);

  return (
    <svg viewBox='0 0 100 100' width={size} height={size} className={mx(classNames)}>
      <motion.path d={path} fill='currentColor' />
    </svg>
  );
};
