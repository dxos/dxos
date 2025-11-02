//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type ClassNameValue, type ThemedClassName } from '@dxos/react-ui';
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
  textClassNames?: ClassNameValue;
  size?: Size;
  index?: number;
  lines?: string[];
  autoAdvance?: boolean;
  greedy?: boolean;
  cyclic?: boolean;
  // Animation duration.
  transition?: number;
  // Minimum time after update before scrolling.
  minDuration?: number;
}>;

/**
 * Single line of text that scrolls.
 */
// TODO(burdon): Component is overly complex.
//  Create simpler controlled component and variant that has auto-advance capability.
export const TextCrawl = ({
  classNames,
  textClassNames,
  size = 'md',
  index: indexParam,
  lines = emptyLines,
  autoAdvance = false,
  greedy = false,
  cyclic,
  transition = 500,
  minDuration = 2_000,
}: TextCrawlProps) => {
  const { className, height } = sizeClassNames[size];
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLinesRef = useRef<string[]>(lines);
  const [index, setIndex] = useState(greedy ? lines.length - 1 : 0);
  console.log(index, lines.length, greedy);

  const updatedRef = useRef(Date.now());
  const setPosition = useCallback(
    (index: number, animate = false) => {
      if (!containerRef.current) {
        return;
      }

      console.log('====', index, animate);
      containerRef.current.style.transition = animate ? `transform ${transition}ms ease-in-out` : 'transform 0ms';
      containerRef.current.style.transform = `translateY(-${index * height}px)`;
    },
    [height, transition],
  );

  // Starting index.
  useEffect(() => {
    setPosition(index, false);
  }, [setPosition]);

  // Controlled.
  useEffect(() => {
    if (indexParam === undefined || indexParam === index) {
      return;
    }

    const next = Math.max(0, Math.min(indexParam, lines.length - 1));
    setIndex(next);
    setPosition(next, true);
  }, [setPosition, indexParam, index]);

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
  }, [setPosition, lines, index, indexParam, cyclic]);

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
    <div role='none' className={mx('relative overflow-hidden', classNames, className)}>
      <div role='none' ref={containerRef} className={mx('flex flex-col')}>
        {lines.map((line, i) => (
          <Line
            key={i}
            line={lines[i]}
            active={index === i || (i === 0 && index === lines.length)}
            transition={transition}
            classNames={[className, textClassNames]}
          />
        ))}
        {cyclic && (
          <Line
            line={lines[0]}
            active={index === lines.length || index === 0}
            transition={transition}
            classNames={[className, textClassNames]}
          />
        )}
      </div>
    </div>
  );
};

const Line = ({
  classNames,
  line,
  active,
  transition,
}: ThemedClassName<{ line: string; active: boolean; transition: number }>) => {
  return (
    <div
      role='none'
      style={{ transitionDuration: `${transition / 2}ms` }}
      className={mx('flex items-center truncate transition-opacity', active ? 'opacity-100' : 'opacity-50', classNames)}
    >
      {line}
    </div>
  );
};
