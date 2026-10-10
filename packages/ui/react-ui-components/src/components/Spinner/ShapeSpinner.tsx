//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React, { forwardRef } from 'react';

import { getSize, mx } from '@dxos/ui-theme';

import { type ActivityState, type SpinnerProps } from './Spinner.tsx';

const stateClassNames: Record<ActivityState, string> = {
  ready: 'bg-primary-500',
  thinking: 'bg-emerald-500',
  alert: 'bg-primary-500',
  error: 'bg-rose-700 border-2 border-rose-bg',
};

/** A morphing square: a slow double pulse, a swelling spin, a rapid flash as a circle, a jolt. */
export const ShapeSpinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ classNames, state = 'ready', duration = 3_000, size = 5, onClick }: SpinnerProps, forwardedRef) => {
    return (
      <AnimatePresence>
        <motion.div
          ref={forwardedRef}
          className={mx('flex shrink-0 cursor-pointer', getSize(size), stateClassNames[state], classNames)}
          transition={{
            ease: 'linear',
            duration: duration / 1_000,
            repeat: Infinity,
          }}
          initial={{
            scale: 0.9,
            rotate: 0,
            borderRadius: '10%',
          }}
          animate={state}
          variants={{
            // A slow double pulse.
            ready: {
              scale: [0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9],
              rotate: [0],
              borderRadius: ['10%'],
            },
            // A spin that swells and shrinks.
            thinking: {
              scale: [0.9, 1, 0.5, 1, 0.9],
              rotate: spinRotatation,
              borderRadius: ['10%', '20%', '10%'],
            },
            // A rapid flash as a circle.
            alert: {
              scale: [0.9, 0.6, 0.2, 0.6, 0.2, 0.6, 0.2, 0.6, 0.2, 0.6, 0.9],
              rotate: [0],
              borderRadius: ['100%'],
            },
            error: {
              scale: [0.9, 0.7, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
              rotate: [0],
              borderRadius: ['10%', '20%', '10%'],
            },
          }}
          exit={{
            opacity: 0,
            rotate: 0,
            scale: 0,
          }}
          onClick={onClick}
        />
      </AnimatePresence>
    );
  },
);

const n = 36;
const a = 40;
const spinRotatation = Array.from({ length: n }).reduce<number[]>(
  (acc, _, i) => {
    acc.push((acc.at(-1) ?? 0) + a * (1 - Math.cos(i * ((Math.PI * 2) / n))));
    return acc;
  },
  [0],
);
