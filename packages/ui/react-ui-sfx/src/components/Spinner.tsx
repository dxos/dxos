//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type SpinnerState = 'pulse' | 'spin' | 'flash';

export type SpinnerProps = ThemedClassName<{
  state?: SpinnerState;
  duration?: number;
}>;

// TODO(burdon): See https://css-tricks.com (using tailwind spin only).
export const Spinner = ({ state = 'pulse', duration = 3, classNames }: SpinnerProps) => (
  <AnimatePresence>
    <motion.div
      className={mx('flex shrink-0 w-5 h-5 bg-primary-500', classNames)}
      transition={{ ease: 'linear', duration, repeat: Infinity }}
      initial={{
        scale: 0.9,
        rotate: 0,
        borderRadius: '10%',
      }}
      variants={{
        pulse: {
          scale: [0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9],
          rotate: [0],
          borderRadius: ['10%'],
        },
        spin: {
          scale: [0.9, 1, 0.5, 1, 0.9],
          rotate,
          borderRadius: ['10%', '20%', '10%'],
        },
        flash: {
          scale: [0.9, 0.2, 0.2, 0.2, 0.9, 0.2, 0.2, 0.2, 0.9],
          rotate: [0],
          borderRadius: ['10%', '50%', '10%'],
        },
      }}
      animate={state}
      exit={{ opacity: 0, scale: 0 }}
    />
  </AnimatePresence>
);

const n = 36;
const a = 40;
const rotate = Array.from({ length: n }).reduce<number[]>(
  (acc, _, i) => {
    acc.push((acc.at(-1) ?? 0) + a * (1 - Math.cos(i * ((Math.PI * 2) / n))));
    return acc;
  },
  [0],
);
