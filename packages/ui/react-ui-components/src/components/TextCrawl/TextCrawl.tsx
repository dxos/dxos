//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { type ClassNameValue, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const emptyLines: string[] = [];

// TODO(burdon): Factor out? Effect literal.
export type Size = 'sm' | 'md' | 'lg';
export const sizes: Size[] = ['sm', 'md', 'lg'];

export type TextCrawlProps = {
  // Auto-advance after `minDuration`.
  autoAdvance?: boolean;
  // Start at the last line.
  greedy?: boolean;
  // Minimum time after update before scrolling.
  minDuration?: number;
} & Pick<TextRibbonProps, 'classNames' | 'textClassNames' | 'size' | 'lines' | 'index' | 'cyclic' | 'transition'>;

/**
 * Scrolling text lines.
 */
export const TextCrawl = ({
  autoAdvance = false,
  greedy = false,
  minDuration = 1_000,
  size = 'md',
  lines = emptyLines,
  index: indexParam,
  cyclic,
  transition = 500,
  ...props
}: TextCrawlProps) => {
  const [index, setIndex] = useState(greedy ? lines.length - 1 : 0);

  // Control ribbon.
  const controllerRef = useRef<TextRibbonController>(null);
  const setPosition = useCallback<TextRibbonController['setPosition']>((index, animate = false) => {
    controllerRef.current?.setPosition(index, animate);
  }, []);

  // Determine if reset.
  const prevLinesRef = useRef<string[]>(lines);
  const wasReset = useMemo(() => {
    const prevLines = prevLinesRef.current;
    const wasReset =
      lines.length < prevLines.length || prevLines.length === 0 || !prevLines.every((line, i) => line === lines[i]);
    prevLinesRef.current = lines;
    return wasReset;
  }, [lines]);

  // Starting index.
  useEffect(() => {
    setPosition(index, false);
  }, []);

  // Controlled.
  useEffect(() => {
    if (indexParam === undefined || indexParam === index) {
      return;
    }

    const next = Math.max(0, Math.min(indexParam, lines.length - 1));
    setIndex(next);
    setPosition(next, true);
  }, [indexParam, index]);

  // Uncontrolled.
  useEffect(() => {
    if (indexParam !== undefined) {
      return;
    }

    let i: NodeJS.Timeout;
    setPosition(index, index !== 0 && !wasReset);
    if (cyclic && index >= lines.length) {
      i = setTimeout(() => {
        setIndex(0);
        setPosition(0, false);
      }, transition);
    }

    return () => {
      clearTimeout(i);
    };
  }, [wasReset, lines, index, indexParam, cyclic]);

  // Auto-advance.
  const lastUpdatedRef = useRef(Date.now());
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

    if (wasReset) {
      setIndex(greedy ? lines.length - 1 : 0);
    } else {
      const now = Date.now();
      const wasVisible = now - lastUpdatedRef.current >= minDuration;
      lastUpdatedRef.current = now;
      if (wasVisible) {
        next();
      }
    }

    const i = setInterval(next, minDuration);
    return () => clearInterval(i);
  }, [lines, wasReset, indexParam, autoAdvance, greedy, minDuration, cyclic, transition]);

  return <TextRibbon ref={controllerRef} size={size} lines={lines} index={index} cyclic={cyclic} {...props} />;
};

//
// Ribbon
//

const sizeClassNames: Record<Size, { height: number; className: string }> = {
  sm: { height: 20, className: 'h-[20px] text-sm' },
  md: { height: 24, className: 'h-[24px]' },
  lg: { height: 28, className: 'h-[28px] text-lg' },
};

export interface TextRibbonController {
  setPosition: (index: number, animate?: boolean) => void;
}

export type TextRibbonProps = ThemedClassName<{
  textClassNames?: ClassNameValue;
  size?: Size;
  lines?: string[];
  index?: number;
  cyclic?: boolean;
  transition?: number;
}>;

export const TextRibbon = forwardRef<TextRibbonController, TextRibbonProps>(
  (
    {
      classNames,
      textClassNames,
      size = 'md',
      lines = emptyLines,
      index = 0,
      cyclic,
      transition = 500,
    }: TextRibbonProps,
    forwardedRef: React.Ref<TextRibbonController>,
  ) => {
    const { className, height } = sizeClassNames[size];
    const containerRef = useRef<HTMLDivElement>(null);

    const setPosition = useCallback<TextRibbonController['setPosition']>(
      (index, animate = false) => {
        if (containerRef.current) {
          containerRef.current.style.transition = animate ? `transform ${transition}ms ease-in-out` : 'transform 0ms';
          containerRef.current.style.transform = `translateY(-${index * height}px)`;
        }
      },
      [height, transition],
    );

    // Controller.
    useImperativeHandle(
      forwardedRef,
      () => ({
        setPosition,
      }),
      [setPosition],
    );

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
  },
);

const Line = ({
  classNames,
  line,
  active,
  transition,
}: ThemedClassName<{ line: string; active: boolean; transition: number }>) => {
  return (
    <div
      role='none'
      style={{ transitionDuration: `${transition / 3}ms` }}
      className={mx('flex items-center truncate transition-opacity', active ? 'opacity-100' : 'opacity-50', classNames)}
    >
      {line}
    </div>
  );
};
