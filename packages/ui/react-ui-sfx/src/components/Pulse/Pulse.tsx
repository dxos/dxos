//
// Copyright 2025 DXOS.org
//

import { useAnimationFrame } from 'motion/react';
import React, { useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type PulseSignal = (i: number, j: number, time: number) => number;

export type PulseProps = ThemedClassName<{
  /** Grid dimension; renders `dim × dim` dots. */
  dim?: number;
  /** Maximum dot radius in CSS pixels (reached when the signal is 1). */
  maxRadius?: number;
  /** Minimum dot radius in CSS pixels (reached when the signal is 0). */
  minRadius?: number;
  /** Spacing between adjacent dot cells in CSS pixels. */
  gap?: number;
  /**
   * Signal driving each dot, called every animation frame.
   * Return a value in [0, 1]; values are clamped. Ignore `i`/`j` for uniform pulsing.
   */
  getSignal?: PulseSignal;
  /** Tween factor toward the target radius each frame (0..1). Higher = snappier. */
  smoothing?: number;
  /** Optional override applied only when growing (target above current). Defaults to `smoothing`. Set to `1` for instant attack with a slow release. */
  growSmoothing?: number;
  /** Canvas fill color; resolves `currentColor` from the element's computed style. */
  color?: string;
  /** When false, all dots ease toward `minRadius`. */
  active?: boolean;
}>;

/**
 * Canvas-rendered `n × n` matrix of circles whose radii grow and shrink in response to an arbitrary signal.
 */
export const Pulse = ({
  classNames,
  dim = 8,
  maxRadius = 8,
  minRadius = 0,
  gap = 4,
  getSignal,
  smoothing = 0.2,
  growSmoothing,
  color = 'currentColor',
  active = true,
}: PulseProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radiiRef = useRef<Float32Array>(new Float32Array(dim * dim));

  const stride = 2 * maxRadius + gap;
  const size = dim * stride - gap;

  useAnimationFrame((time) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelSize = Math.max(1, Math.round(size * dpr));
    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = pixelSize;
      canvas.height = pixelSize;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = color === 'currentColor' ? getComputedStyle(canvas).color : color;

    // Resize the radii buffer in sync with `dim` to avoid out-of-bounds access on the frame after dim changes.
    if (radiiRef.current.length !== dim * dim) {
      radiiRef.current = new Float32Array(dim * dim);
    }
    const radii = radiiRef.current;
    const seconds = time / 1_000;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        const idx = i * dim + j;
        const raw = active && getSignal ? getSignal(i, j, seconds) : 0;
        const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
        const target = minRadius + (maxRadius - minRadius) * clamped;
        const delta = target - radii[idx];
        const factor = delta > 0 ? (growSmoothing ?? smoothing) : smoothing;
        radii[idx] += delta * factor;
        const r = radii[idx];
        if (r > 0.25) {
          const cx = i * stride + maxRadius;
          const cy = j * stride + maxRadius;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });

  return <canvas ref={canvasRef} className={mx('block', classNames)} style={{ width: size, height: size }} />;
};
