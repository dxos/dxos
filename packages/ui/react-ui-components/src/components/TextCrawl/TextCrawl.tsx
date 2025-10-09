//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { type ThemedClassName, useDynamicRef, useStateWithRef } from '@dxos/react-ui';
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

export type TextCrawlProps = ThemedClassName<{
  size?: Size;
  index?: number;
  lines?: string[];
  autoAdvance?: boolean;
  cyclic?: boolean;
  transition?: number;
  minDuration?: number;
}>;

/**
 * Single line of text that scrolls.
 */
export const TextCrawl = ({
  classNames,
  size = 'md',
  index: indexParam = -1,
  lines = emptyLines,
  cyclic,
  autoAdvance = false,
  transition = 250,
  minDuration = 1_000,
}: TextCrawlProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesLength = useDynamicRef(lines.length);
  const lastRoll = useRef(Date.now());
  const [index, setIndex, indexRef] = useStateWithRef(indexParam);

  // Index.
  useEffect(() => {
    setIndex(indexParam);
  }, [indexParam]);

  // Auto-advance.
  useEffect(() => {
    if (lines.length < indexRef.current) {
      setIndex(0);
    }

    if (!autoAdvance) {
      setIndex(indexParam === -1 ? lines.length - 1 : indexParam);
      return;
    }

    const next = () => {
      setIndex((prev) => {
        if (prev >= linesLength.current! - 1) {
          return cyclic ? 0 : prev;
        }

        lastRoll.current = Date.now();
        return prev + 1;
      });
    };

    let i: NodeJS.Timeout | undefined = undefined;
    if (Date.now() - lastRoll.current > minDuration) {
      clearInterval(i);
      next();
    }

    i = setInterval(next, minDuration);
    return () => clearInterval(i);
  }, [lines.length, cyclic, autoAdvance, minDuration]);

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

      containerRef.current.style.transition = `transform ${transition}ms cubic-bezier(0.25, 1.25, 0.5, 1)`;
      containerRef.current.style.transform = `translateY(-${i * height}px)`;
    }
  }, [height, index]);

  return (
    <div className={mx('relative overflow-hidden', classNames)}>
      <div ref={containerRef} className={mx(className)}>
        <div className='flex flex-col'>
          {lines.map((line, i) => (
            <div key={i} className={mx('flex items-center', className)}>
              <span className='truncate'>{line}</span>
            </div>
          ))}
          {cyclic && (
            <div className={mx('flex items-center', className)}>
              <span className='truncate'>{lines[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
