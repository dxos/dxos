//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
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
  index: indexParam,
  lines = emptyLines,
  autoAdvance = false,
  cyclic,
  transition = 500,
  minDuration = 1_000,
}: TextCrawlProps) => {
  const { className, height } = sizeClassNames[size];
  const rootRef = useRef<HTMLDivElement>(null);
  const prevLinesRef = useRef<string[]>(lines);
  const [index, setIndex] = useState(indexParam ?? 0);

  const updatedRef = useRef(Date.now());
  const setPosition = useCallback(
    (index: number, animate = false) => {
      if (!rootRef.current) {
        return;
      }

      rootRef.current.style.transform = `translateY(-${index * height}px)`;
      rootRef.current.style.transition = animate ? `transform ${transition}ms ease-in-out` : 'transform 0ms';
    },
    [height, transition],
  );

  // Controlled.
  useEffect(() => {
    if (indexParam === undefined) {
      return;
    }

    const next = Math.max(0, Math.min(indexParam, lines.length - 1));
    setIndex(next);
    setPosition(next, false);
  }, [indexParam]);

  // Uncontrolled.
  useEffect(() => {
    if (indexParam !== undefined) {
      return;
    }

    let i: NodeJS.Timeout;
    setPosition(index, index !== 0);
    if (cyclic && index >= lines.length) {
      i = setTimeout(() => {
        setPosition(0, false);
        setIndex(0);
      }, transition);
    }

    return () => {
      clearTimeout(i);
    };
  }, [lines, index, indexParam, cyclic]);

  // Auto-advance.
  useEffect(() => {
    if (!autoAdvance) {
      return;
    }

    const next = () => {
      setIndex((prev) => {
        const next = Math.min(prev + 1, lines.length);
        if (next >= lines.length) {
          if (cyclic) {
            return next;
          } else {
            clearInterval(i);
            return prev;
          }
        }

        return next;
      });
    };

    // Determine if `lines` is completely different or a new line was added.
    const prevLines = prevLinesRef.current;
    const wasReset =
      lines.length < prevLines.length ||
      (lines.length > 0 && prevLines.length > 0 && !prevLines.every((line, i) => line === lines[i]));
    prevLinesRef.current = lines;
    if (wasReset) {
      setIndex(0);
    } else if (Date.now() - updatedRef.current >= minDuration) {
      next();
    }
    updatedRef.current = Date.now();

    const i = setInterval(next, minDuration);
    return () => clearInterval(i);
  }, [lines, indexParam, autoAdvance, cyclic, transition, minDuration]);

  return (
    <div role='none' className={mx('relative overflow-hidden', classNames)}>
      <div role='none' ref={rootRef} className={mx(className)}>
        <div role='none' className='flex flex-col'>
          {lines.map((line, i) => (
            <div
              key={i}
              role='none'
              style={{
                transitionDuration: `${transition / 2}ms`,
              }}
              className={mx(
                'items-center truncate transition-opacity',
                index === i || (i === 0 && index === lines.length) ? 'opacity-100' : 'opacity-50',
                className,
              )}
            >
              {line}
            </div>
          ))}
          {cyclic && (
            <div
              role='none'
              style={{
                transitionDuration: `${transition / 2}ms`,
              }}
              className={mx(
                'items-center truncate transition-opacity',
                index === lines.length || index === 0 ? 'opacity-100' : 'opacity-50',
                className,
              )}
            >
              {lines[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
