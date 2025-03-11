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
  line?: number;
  lines?: string[];
  autoAdvance?: boolean;
  transition?: number;
  duration?: number;
}>;

/**
 * Single line of text that scrolls.
 */
export const StatusRoll = ({
  classNames,
  size = 'md',
  line = -1,
  lines = emptyLines,
  autoAdvance,
  transition = 300,
  duration = 1_000,
}: StatusRollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentLine, setCurrentLine] = useState(line);
  const linesLength = useDynamicRef(lines.length);
  const lastRoll = useRef(Date.now());
  useEffect(() => setCurrentLine(line), [line]);
  useEffect(() => {
    if (!autoAdvance) {
      return;
    }

    const next = () => {
      setCurrentLine((prev) => {
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
      containerRef.current.style.transition = `transform ${transition}ms ease-in-out`;
      containerRef.current.style.transform = `translateY(-${currentLine * height}px)`;
    }
  }, [height, currentLine]);

  return (
    <div className={mx('overflow-hidden', classNames)}>
      <div ref={containerRef} className={mx('relative flex flex-col py-0', className)}>
        {lines.map((line, i) => (
          <div key={i} className={mx('flex items-center', className)}>
            <span className='truncate'>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
