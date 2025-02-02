//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

export type BallProps = {
  active?: boolean;
};

export const Ball = ({ active }: BallProps) => (
  <AnimatePresence>
    <motion.div
      className='w-5 h-5 bg-primary-500 rounded-full'
      transition={{ ease: 'easeOut', duration: 1.5 }}
      initial={{
        opacity: 0,
        scale: 0,
        rotate: 0,
        borderRadius: '0%',
      }}
      variants={{
        inactive: {
          opacity: 1,
          scale: [0.5, 1, 1.2, 0.8, 1.1, 0.9, 1],
          rotate: [0, 0, 90, -90, 0],
          borderRadius: ['0%', '0%', '50%', '50%', '30%'],
        },
        active: {
          opacity: 0.75,
          scale: [1, 0.5, 0.7, 0.3],
          rotate: [0, 0, 90, 0],
          borderRadius: '50%',
        },
      }}
      animate={active ? 'active' : 'inactive'}
      exit={{ opacity: 0, scale: 0 }}
    />
  </AnimatePresence>
);
