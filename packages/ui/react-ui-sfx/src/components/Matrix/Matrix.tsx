//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo } from 'react';

import { type Size, type ThemedClassName } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/ui-theme';

export type MatrixProps = ThemedClassName<{
  dim?: number;
  count?: number;
  size?: Size;
  dotSize?: number;
}>;

export const Matrix = ({ classNames, dim = 5, count = 20, size = 5, dotSize = 4 }: MatrixProps) => {
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
    <div className={mx('flex shrink-0 items-center', getSize(size), classNames)}>
      <div className='relative flex is-full bs-full'>
        <AnimatePresence>
          {Array.from({ length: count }).map((_, i) => (
            <Dot key={i} variants={variants} variant={randomVariant()} size={dotSize} classNames='bg-primary-500' />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// TODO(burdon): Vary size; convert size to pixels.
const Dot = ({
  classNames,
  variants,
  variant,
  size = 4,
}: ThemedClassName<{ variants: Record<string, any>; variant: string; size?: number }>) => (
  <motion.div
    className={mx('absolute', classNames)}
    style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    transition={{ ease: 'easeInOut', duration: 0.2 }}
    variants={variants}
    initial={variants[variant]}
    animate={variant}
  />
);
