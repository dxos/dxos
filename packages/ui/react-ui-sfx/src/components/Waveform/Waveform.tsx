//
// Copyright 2025 DXOS.org
//

import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type Range = {
  duration: number;
  scaleY: [number, number, number];
}[];

const createRange = (n: number): Range =>
  Array.from({ length: n }, (_, i) => {
    const range = 0.25 + Math.sin(i * (Math.PI / (n - 1))) * 0.75;
    return {
      duration: 0.5 + Math.abs(Math.random() * 0.5),
      scaleY: [range, range / 2, range],
    };
  });

const range = createRange(5);

const sizes: Record<number, { range: Range; classNames: string; h: string }> = {
  3: { range, classNames: 'w-3 h-3 gap-[1px]', h: 'w-[1px] h-[12px]' },
  4: { range, classNames: 'w-4 h-4 gap-[1px]', h: 'w-[1.5px] h-[14px]' },
  5: { range, classNames: 'w-5 h-5 gap-[2px]', h: 'w-[1.5px] h-[20px]' },
  6: { range, classNames: 'w-6 h-6 gap-[2px]', h: 'w-[2px] h-[22px]' },
};

export type WaveformProps = ThemedClassName<{
  active?: boolean;
  size?: number;
}>;

export const Waveform = ({ classNames, active, size: _size = 4 }: WaveformProps) => {
  const size = Math.max(3, Math.min(6, _size));
  const { range, classNames: waveClassNames, h } = sizes[size];

  return (
    <AnimatePresence>
      <div className={mx('flex p-1 bg-neutral-200 dark:bg-neutral-800 rounded', classNames)}>
        <div className={mx('flex is-full bs-full items-center justify-center', waveClassNames)}>
          {range.map(({ duration, scaleY }, i) => {
            return (
              <motion.div
                key={i}
                className={mx('flex bg-neutral-800 dark:bg-neutral-100', h)}
                transition={{ ease: 'linear', duration, repeat: Infinity }}
                initial={{ scaleY: [0.1] }}
                variants={{
                  active: {
                    scaleY,
                  },
                  inactive: {
                    scaleY: [0.1],
                  },
                }}
                animate={active ? 'active' : 'inactive'}
              />
            );
          })}
        </div>
      </div>
    </AnimatePresence>
  );
};
