//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';

import { ClassNameValue, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type MatrixProps = ThemedClassName<{
  dotClassNames?: ClassNameValue;
  dim?: number;
  count?: number;
  gap?: number;
  dotSize?: number;
  /** When true, the matrix runs an internal interval loop and re-randomizes dot positions on every tick. */
  active?: boolean;
  /** Re-randomization interval in ms while `active`. Defaults to 500. */
  interval?: number;
}>;

/**
 * 4-1-4-1-4-1-4-1-4 = 24
 */
export const Matrix = ({
  classNames,
  dotClassNames,
  dim = 5,
  count = 20,
  gap = 1,
  dotSize = 4,
  active = false,
  interval = 500,
}: MatrixProps) => {
  const size = dim * dotSize + (dim - 1) * gap;

  const variants = useMemo(() => {
    const variants: Record<string, any> = {};
    for (let x = 0; x <= dim - 1; x++) {
      for (let y = 0; y <= dim - 1; y++) {
        variants[`${x}-${y}`] = {
          left: x * (dotSize + gap),
          top: y * (dotSize + gap),
        };
      }
    }

    return variants;
  }, [dim, dotSize, gap]);

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
    <div role='none' className={mx('grid place-items-center shrink-0', classNames)}>
      <div role='none' style={{ width: size, height: size }} className='relative'>
        <AnimatePresence>
          {positions.map((variant, i) => (
            <Dot
              key={i}
              classNames={dotClassNames}
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

type DotProps = ThemedClassName<{
  variants: Record<string, any>;
  variant: string;
  size?: number;
  duration?: number;
}>;

const Dot = ({ classNames, variants, variant, size = 4, duration = 0.2 }: DotProps) => (
  <motion.div
    className={mx('absolute', classNames)}
    style={{ width: size, height: size }}
    transition={{ ease: 'easeInOut', duration }}
    variants={variants}
    initial={variants[variant]}
    animate={variant}
  />
);
