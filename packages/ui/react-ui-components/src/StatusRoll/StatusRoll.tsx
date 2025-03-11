//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { useDynamicRef, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const emptyLines: string[] = [];

// TODO(burdon): Factor out?
export type Size = 'sm' | 'md' | 'lg';
export const sizes: Size[] = ['sm', 'md', 'lg'];

const sizeClassNames: Record<Size, { height: number; className: string }> = {
  sm: { height: 20, className: 'h-[20px] text-sm' },
  md: { height: 24, className: 'h-[24px]' },
  lg: { height: 28, className: 'h-[28px] text-lg' },
};

export type StatusRollProps = ThemedClassName<{
  size?: Size;
  index?: number;
  lines?: string[];
  autoAdvance?: boolean;
  cyclic?: boolean;
  transition?: number;
  duration?: number;
}>;

/**
 * Single line of text that scrolls.
 */
export const StatusRoll = ({
  classNames,
  size = 'md',
  index: _index = -1,
  lines = emptyLines,
  cyclic,
  autoAdvance,
  transition = 300,
  duration = 1_000,
}: StatusRollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(_index);
  useEffect(() => setIndex(_index), [_index]);
  const linesLength = useDynamicRef(lines.length);
  const lastRoll = useRef(Date.now());
  useEffect(() => {
    if (!autoAdvance) {
      return;
    }

    const next = () => {
      setIndex((prev) => {
        if (prev >= linesLength.current - 1) {
          clearInterval(i);
          return prev;
        }

        lastRoll.current = Date.now();
        return prev + 1;
      });
    };

    if (Date.now() - lastRoll.current > duration) {
      next();
    }

    const i = setInterval(next, duration);
    return () => clearInterval(i);
  }, [lines.length, autoAdvance, duration]);

  const { className, height } = sizeClassNames[size];
  useEffect(() => {
    if (containerRef.current) {
      let i = index;
      if (cyclic && index === 0) {
        i = lines.length;
        setTimeout(() => {
          // Jump back to start.
          if (containerRef.current) {
            containerRef.current.style.transition = 'transform 0ms';
            containerRef.current.style.transform = 'translateY(0px)';
          }
        }, transition);
      }

      containerRef.current.style.transition = `transform ${transition}ms ease-in-out`;
      containerRef.current.style.transform = `translateY(-${i * height}px)`;
    }
  }, [height, index]);

  return (
    <div className={mx('relative overflow-hidden', classNames)}>
      <div ref={containerRef} className={mx(className)}>
        <div className='flex flex-col'>
          {lines.map((line, i) => (
            <div key={i} className={mx('items-center truncate', className)}>
              {line}
            </div>
          ))}
          {cyclic && <div className={mx('items-center truncate', className)}>{lines[0]}</div>}
        </div>
      </div>
    </div>
  );
};
