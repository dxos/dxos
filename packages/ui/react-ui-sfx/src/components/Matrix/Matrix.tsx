//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';

import { type Size, type ThemedClassName } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/ui-theme';

export type MatrixProps = ThemedClassName<{
  dim?: number;
  count?: number;
  size?: Size;
  dotSize?: number;
  /** When true, the matrix runs an internal interval loop and re-randomizes dot positions on every tick. */
  active?: boolean;
  /** Re-randomization interval in ms while `active`. Defaults to 500. */
  interval?: number;
}>;

export const Matrix = ({
  classNames,
  dim = 5,
  count = 20,
  size = 5,
  dotSize = 4,
  active = false,
  interval = 500,
}: MatrixProps) => {
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

  // Internal tick — incremented every `interval` ms while `active`. Drives position randomization.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = setInterval(() => setTick((t) => t + 1), interval);
    return () => clearInterval(id);
  }, [active, interval]);

  // Positions re-randomize whenever `count`, `dim`, or `tick` changes.
  const positions = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const x = Math.floor(Math.random() * dim);
        const y = Math.floor(Math.random() * dim);
        return `${x}-${y}`;
      }),
    [count, dim, tick],
  );

  return (
    <div className={mx('flex shrink-0 items-center', getSize(size), classNames)}>
      <div className='dx-expander relative flex'>
        <AnimatePresence>
          {positions.map((variant, i) => (
            <Dot
              key={i}
              classNames='bg-primary-500'
              variants={variants}
              variant={variant}
              size={dotSize}
              duration={Math.min(interval / 1_000, 0.2)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Dot = ({
  classNames,
  variants,
  variant,
  size = 4,
  duration = 0.2,
}: ThemedClassName<{ variants: Record<string, any>; variant: string; size?: number; duration?: number }>) => (
  <motion.div
    className={mx('absolute', classNames)}
    style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    transition={{ ease: 'easeInOut', duration }}
    variants={variants}
    initial={variants[variant]}
    animate={variant}
  />
);
