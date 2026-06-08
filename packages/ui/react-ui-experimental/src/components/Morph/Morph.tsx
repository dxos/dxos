//
// Copyright 2025 DXOS.org
//

import { interpolate } from 'flubber';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import React, { useEffect, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Builds an n-point star SVG path with alternating outer/inner radii around (cx, cy).
 * First vertex sits at the top (angle = -π/2).
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

/**
 * Builds a circular path of radius `r` around (cx, cy) using four cubic beziers.
 * Starts at the top vertex (cx, cy - r). Bezier handle = r · 0.5523.
 */
const buildCirclePath = (cx: number, cy: number, r: number): string => {
  const k = r * 0.5523;
  const top = { x: cx, y: cy - r };
  const right = { x: cx + r, y: cy };
  const bottom = { x: cx, y: cy + r };
  const left = { x: cx - r, y: cy };
  const f = (n: number) => n.toFixed(3);
  return [
    `M${f(top.x)},${f(top.y)}`,
    `C${f(top.x + k)},${f(top.y)} ${f(right.x)},${f(right.y - k)} ${f(right.x)},${f(right.y)}`,
    `C${f(right.x)},${f(right.y + k)} ${f(bottom.x + k)},${f(bottom.y)} ${f(bottom.x)},${f(bottom.y)}`,
    `C${f(bottom.x - k)},${f(bottom.y)} ${f(left.x)},${f(left.y + k)} ${f(left.x)},${f(left.y)}`,
    `C${f(left.x)},${f(left.y - k)} ${f(top.x - k)},${f(top.y)} ${f(top.x)},${f(top.y)}`,
    'Z',
  ].join(' ');
};

const STAR1_PATH = buildStarPath(50, 50, 40, 18, 6);
const STAR2_PATH = buildStarPath(50, 50, 40, 18, 8);

const CIRCLE_PATH = buildCirclePath(50, 50, 10);

export type MorphProps = ThemedClassName<{
  /** Pixel size of the rendered SVG (square). */
  size?: number;
  /** Duration of one segment (star↔circle) in seconds. Full cycle = 4× this value. */
  duration?: number;
}>;

/**
 * Infinite morph cycle: 6-point star → small circle → 8-point star → small circle → 6-point star.
 * Inspired by https://motion.dev/tutorials/react-path-morphing.
 */
export const Morph = ({ classNames, size = 32, duration = 2 }: MorphProps) => {
  const progress = useMotionValue(0);
  const inter1 = useMemo(() => interpolate(STAR1_PATH, CIRCLE_PATH, { maxSegmentLength: 2 }), []);
  const inter2 = useMemo(() => interpolate(CIRCLE_PATH, STAR2_PATH, { maxSegmentLength: 2 }), []);
  const path = useTransform(progress, (t) => (t <= 1 ? inter1(t) : inter2(t - 1)));

  useEffect(() => {
    const controls = animate(progress, [0, 1, 2, 1, 0], {
      duration: duration * 4,
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
