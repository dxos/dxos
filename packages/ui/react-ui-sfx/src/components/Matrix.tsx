//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const Dot = ({
  classNames,
  variants,
  variant,
}: ThemedClassName<{ variants: Record<string, any>; variant: string }>) => (
  <motion.div
    className={mx('absolute w-1 h-1 -mx-0.5 -my-0.5 bg-primary-500 rounded-full', classNames)}
    transition={{ ease: 'easeInOut', duration: 0.2 }}
    variants={variants}
    initial={variants[variant]}
    animate={variant}
  />
);

export type MatrixProps = {
  dim?: number;
  count?: number;
};

export const Matrix = ({ dim = 5, count = 20 }: MatrixProps) => {
  const variants = useMemo(() => {
    const variants: Record<string, any> = {};
    for (let x = 0; x <= dim - 1; x++) {
      for (let y = 0; y <= dim - 1; y++) {
        variants[`${x}-${y}`] = {
          left: `${(100 * x) / (dim - 1)}%`,
          top: `${(100 * y) / (dim - 1)}%`,
        };
      }
    }

    return variants;
  }, [dim]);

  const randomVariant = () => {
    const x = Math.floor(Math.random() * dim);
    const y = Math.floor(Math.random() * dim);
    return `${x}-${y}`;
  };

  return (
    <div className='flex shrink-0 w-5 h-5 items-center'>
      <div className='flex w-full h-full relative'>
        <AnimatePresence>
          {Array.from({ length: count }).map((_, i) => (
            <Dot key={i} variants={variants} variant={randomVariant()} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
