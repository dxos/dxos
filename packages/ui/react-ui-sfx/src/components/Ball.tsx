//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

export type BallProps = {
  active?: boolean;
};

const n = 36;
const a = 40;
const rotate = Array.from({ length: n }).reduce<number[]>(
  (acc, _, i) => {
    acc.push((acc.at(-1) ?? 0) + a * (1 - Math.cos(i * ((Math.PI * 2) / n))));
    return acc;
  },
  [0],
);

export const Ball = ({ active }: BallProps) => (
  <AnimatePresence>
    <motion.div
      className='flex shrink-0 w-full h-full bg-primary-500'
      transition={{ ease: 'linear', duration: 4, repeat: Infinity }}
      initial={{
        scale: 0.9,
        rotate: 0,
        borderRadius: '10%',
        // backgroundColor: '#ff0000',
      }}
      variants={{
        inactive: {
          scale: [0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9],
          rotate: [0],
          borderRadius: ['10%'],
          // backgroundColor: '#5555ff',
        },
        active: {
          scale: [1, 0.5, 1],
          rotate,
          borderRadius: ['10%', '20%', '10%'],
          // backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ff0000'],
        },
      }}
      animate={active ? 'active' : 'inactive'}
      exit={{ opacity: 0, scale: 0 }}
    />
  </AnimatePresence>
);
