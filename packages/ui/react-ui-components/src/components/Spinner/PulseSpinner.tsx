//
// Copyright 2026 DXOS.org
//

import { useAnimationFrame } from 'motion/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';
import { type Size } from '@dxos/ui-types';

import { type ActivityState, type SpinnerProps } from './Spinner.tsx';

//
// Signals
//

/** A signal scaled down, so dots peak smaller in the same footprint. */
const scaled =
  (signal: DotSignal, scale: number): DotSignal =>
  (i, j, time) =>
    signal(i, j, time) * scale;

/** A radial wave about the centre of a `dim × dim` grid. */
const radialWave =
  (dim: number): DotSignal =>
  (i, j, time) => {
    const centre = (dim - 1) / 2;
    const distance = Math.hypot(i - centre, j - centre);
    return 0.5 + 0.5 * Math.sin(time * 2 - distance * 0.9);
  };

/** Plays `signal` once from the first frame it is asked for, for `duration` seconds, never dropping below `rest`. */
const once = (signal: DotSignal, duration: number, rest = 0): DotSignal => {
  let start: number | undefined;
  return (i, j, time) => {
    start ??= time;
    const elapsed = time - start;
    return elapsed < duration ? Math.max(rest, signal(i, j, elapsed)) : rest;
  };
};

/** Seconds per beat, and the gap between its two pulses. */
const HEARTBEAT_PERIOD = 1.4;
const HEARTBEAT_GAP = 0.3;
/** The first pulse waits for the dots to settle from the previous state, or the eased change swallows it. */
const HEARTBEAT_START = 0.35;
/** Each pulse's width (σ, seconds): wide enough to outlast the per-frame easing toward it. */
const HEARTBEAT_WIDTH = 0.07;

/**
 * The whole grid beats twice and rests, like a heartbeat: one rhythm across every dot, so it reads as a call for
 * attention rather than as motion; the corners trail the centre slightly so the beat swells outwards.
 */
const heartbeat =
  (dim: number): DotSignal =>
  (i, j, time) => {
    const centre = (dim - 1) / 2;
    const delay = Math.hypot(i - centre, j - centre) * 0.04;
    const phase = (time - delay) % HEARTBEAT_PERIOD;
    const pulse = (at: number) => Math.exp(-((phase - at) ** 2) / (2 * HEARTBEAT_WIDTH ** 2));
    return Math.max(pulse(HEARTBEAT_START), 0.85 * pulse(HEARTBEAT_START + HEARTBEAT_GAP));
  };

/** Seconds per lap of the orbit. */
const ORBIT_PERIOD = 1.2;

/**
 * A light chasing round the grid's outer ring with a fading tail, the inner dots dark: a circling beacon that keeps
 * moving without filling the grid, unlike the ready wave or the error sweep.
 */
const orbit =
  (dim: number): DotSignal =>
  (i, j, time) => {
    const last = dim - 1;
    if (i > 0 && i < last && j > 0 && j < last) {
      return 0;
    }

    // Position along the ring, clockwise from the top-left corner.
    const ring = 4 * last;
    const position = j === 0 ? i : i === last ? last + j : j === last ? 3 * last - i : ring - j;
    const head = ((time / ORBIT_PERIOD) % 1) * ring;
    const behind = (head - position + ring) % ring;
    return Math.exp(-behind / 2.5);
  };

/** Randomly pings dots every `interval` milliseconds; each decays back to zero (half-life ≈ 0.46s). */
const useRandomPing = (dim: number, interval: number): DotSignal => {
  const valuesRef = useRef<Float32Array>(new Float32Array(dim * dim));
  const lastTimeRef = useRef(0);

  useEffect(() => {
    valuesRef.current = new Float32Array(dim * dim);
    lastTimeRef.current = 0;
  }, [dim]);

  // Thinking.
  useEffect(() => {
    const id = setInterval(() => {
      valuesRef.current[Math.floor(Math.random() * valuesRef.current.length)] = 1;
    }, interval);

    return () => clearInterval(id);
  }, [interval]);

  return useCallback<DotSignal>(
    (i, j, time) => {
      if (time !== lastTimeRef.current) {
        const dt = lastTimeRef.current === 0 ? 0 : time - lastTimeRef.current;
        const decay = Math.exp(-dt * 1.5);
        const values = valuesRef.current;
        for (let k = 0; k < values.length; k++) {
          values[k] *= decay;
        }
        lastTimeRef.current = time;
      }
      return valuesRef.current[i * dim + j];
    },
    [dim],
  );
};

export type DotSignal = (i: number, j: number, time: number) => number;

export type DotMatrixProps = Util.ThemedClassName<{
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
  getSignal?: DotSignal;
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
 * `PulseSpinner`'s renderer, copied from react-ui-experimental's `Pulse` so this package does not depend on that one.
 *
 * Canvas-rendered `n × n` matrix of circles whose radii grow and shrink in response to an arbitrary signal.
 */
export const DotMatrix = ({
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
}: DotMatrixProps) => {
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

//
// Spinner
//

/** Four dots a side, touching: an icon-sized matrix. */
const DIM = 4;

/** The theme's size scale in CSS pixels (a step is a quarter rem). */
const pixels = (size: Size): number => (size === 'px' ? 1 : size * 4);

// Smaller peaks than thinking's pings, in the same footprint: the signal is scaled rather than the radius, so every
// state keeps the spinner's size and dot positions.
const READY = scaled(radialWave(DIM), 0.6);
const ALERT = scaled(orbit(DIM), 0.8);

/** Where the error beat settles: the grid stays lit at a quarter size, so the state reads after the beat has passed. */
const ERROR_REST = 0.25;

const COLORS: Record<ActivityState, string> = {
  ready: 'text-primary-500',
  thinking: 'text-primary-500',
  alert: 'text-amber-500',
  error: 'text-rose-500',
};

/** A dot matrix: a wave when ready, random pings while thinking, an amber orbit on alert, one heartbeat on error. */
export const PulseSpinner = ({ classNames, state = 'ready', size = 5, onClick }: SpinnerProps) => {
  const thinking = useRandomPing(DIM, 100);
  // A single beat each time the spinner enters the error state: an error is news once, not an alarm that keeps ringing.
  const failing = state === 'error';
  const error = useMemo(() => (failing ? once(heartbeat(DIM), HEARTBEAT_PERIOD, ERROR_REST) : undefined), [failing]);
  const maxRadius = pixels(size) / DIM / 2;

  return (
    // The click target, as the shape spinner's own element is; a layout primitive takes no handlers.
    <div role='none' className={mx('flex shrink-0 cursor-pointer', classNames)} onClick={onClick}>
      <DotMatrix
        dim={DIM}
        maxRadius={maxRadius}
        minRadius={maxRadius / 6}
        gap={0}
        smoothing={0.3}
        classNames={COLORS[state]}
        getSignal={state === 'thinking' ? thinking : state === 'alert' ? ALERT : (error ?? READY)}
      />
    </div>
  );
};

PulseSpinner.displayName = 'PulseSpinner';
