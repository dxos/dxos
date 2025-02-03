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
      className='flex shrink-0 w-full h-full bg-primary-500'
      transition={{ ease: 'linear', duration: 4, repeat: Infinity }}
      initial={{
        opacity: 1,
        scale: 0.9,
        rotate: 0,
        borderRadius: '50%',
        // backgroundColor: '#ff0000',
      }}
      variants={{
        active: {
          // opacity: 0.75,
          scale: [1],
          rotate: [0, 10, 10, 10, 20, 20, 30, 40, 50, 70, 90, 135, 180, 225, 270, 315, 360],
          borderRadius: ['50%', '10%'],
        },
        inactive: {
          rotate: [0, 10, 30, 60, 90, 120, 150, 180, 270, 360, 90, 180, 270, 360, 90, 180, 270, 360],
          borderRadius: ['10%', '10%'],
        },
        // inactive: {
        //   scale: [0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9, 0.8, 0.9, 0.8, 0.9, 0.9, 0.9],
        //   // backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ff0000'],
        // },
      }}
      animate={active ? 'active' : 'inactive'}
      exit={{ opacity: 0, scale: 0 }}
    />
  </AnimatePresence>
);
