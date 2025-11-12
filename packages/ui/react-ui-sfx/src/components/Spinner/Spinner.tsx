//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React, { forwardRef } from 'react';

import { type Size, type ThemedClassName } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

export type SpinnerState = 'pulse' | 'spin' | 'flash' | 'error';

export type SpinnerProps = ThemedClassName<{
  state?: SpinnerState;
  duration?: number;
  size?: Size;
  onClick?: () => void;
}>;

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ classNames, state = 'pulse', duration = 3_000, size = 5, onClick }: SpinnerProps, forwardedRef) => {
    return (
      <AnimatePresence>
        <motion.div
          ref={forwardedRef}
          className={mx(
            'flex shrink-0 cursor-pointer',
            getSize(size),
            state === 'error' ? 'bg-rose-700 border-2 border-roseFill' : 'bg-primary-400',
            classNames,
          )}
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
            pulse: {
              scale: [0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9],
              rotate: [0],
              borderRadius: ['10%'],
            },
            spin: {
              scale: [0.9, 1, 0.5, 1, 0.9],
              rotate: spinRotatation,
              borderRadius: ['10%', '20%', '10%'],
            },
            flash: {
              scale: [0.9, 0.2, 0.2, 0.2, 0.9, 0.2, 0.2, 0.2, 0.9],
              rotate: [0],
              borderRadius: ['10%', '50%', '10%'],
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
