//
// Copyright 2025 DXOS.org
//

import React, {
  type ComponentPropsWithRef,
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type CSSVariables } from '../Container/index.ts';

const emptyLines: string[] = [];

export type TextCrawlProps = ThemedClassName<Omit<ComponentPropsWithRef<'div'>, 'children'>> & {
  lines?: string[];
  /** The line shown (controlled); absent, the crawl owns it. */
  index?: number;
  /** Wraps from the last line back to the first, scrolling on through a copy of the first. */
  cyclic?: boolean;
  /** Milliseconds a scroll takes. */
  transition?: number;
  /** Advances every `minDuration` (uncontrolled). */
  autoAdvance?: boolean;
  /** Starts at, and keeps to, the last line (uncontrolled). */
  greedy?: boolean;
  /** Least time a line is shown before advancing. */
  minDuration?: number;
};

/**
 * Text lines in a one-line window that scroll up from one to the next. The line height is the inherited size's
 * `--nx-line-height`, so the crawl sizes with its row rather than having a scale of its own; the scroll is a CSS
 * transform driven by `--nx-text-crawl-index`, and only lines other than the shown one are hidden from assistive tech.
 */
export const TextCrawl = forwardRef<HTMLDivElement, TextCrawlProps>(
  (
    {
      classNames,
      lines = emptyLines,
      index: indexProp,
      cyclic,
      transition = 500,
      autoAdvance = false,
      greedy = false,
      minDuration = 1_000,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const [index, setIndex] = useState(() => (greedy ? Math.max(0, lines.length - 1) : 0));

    // Written to the ribbon directly rather than through state, so a jump and the animation that follows it are not
    // batched into one render.
    const ribbonRef = useRef<HTMLDivElement>(null);
    const setPosition = useCallback((position: number, animate = false) => {
      const ribbon = ribbonRef.current;
      if (ribbon) {
        ribbon.style.setProperty('--nx-text-crawl-index', String(position));
        ribbon.toggleAttribute('data-animate', animate);
      }
    }, []);

    // A crawl whose lines shrank or changed (rather than grew) starts over.
    const prevLinesRef = useRef<string[]>(lines);
    const wasReset = useMemo(() => {
      const prevLines = prevLinesRef.current;
      const reset =
        lines.length < prevLines.length || prevLines.length === 0 || !prevLines.every((line, i) => line === lines[i]);
      prevLinesRef.current = lines;
      return reset;
    }, [lines]);

    const paintedRef = useRef(false);
    useEffect(() => {
      setPosition(index, false);
    }, []);

    // Greedy: keep an uncontrolled crawl on the last line as lines arrive.
    useEffect(() => {
      if (!greedy || indexProp !== undefined || lines.length === 0) {
        return;
      }

      const lastIndex = lines.length - 1;
      setIndex((prev) => (prev === lastIndex ? prev : lastIndex));
    }, [greedy, lines, indexProp]);

    // Controlled.
    useEffect(() => {
      if (indexProp === undefined || indexProp === index) {
        return;
      }

      const next = Math.max(0, Math.min(indexProp, lines.length - 1));
      setIndex(next);
      setPosition(next, true);
    }, [indexProp, index]);

    // Uncontrolled.
    useEffect(() => {
      if (indexProp !== undefined) {
        return;
      }

      let timeout: ReturnType<typeof setTimeout> | undefined;
      // `greedy` arrives at the last line on the first paint only; testing it on every update would suppress the
      // animation for good.
      const settled = paintedRef.current;
      paintedRef.current = true;
      setPosition(index, settled && index !== 0 && !wasReset);
      if (cyclic && index >= lines.length) {
        // Scrolled onto the copy of the first line: jump back to the real one once the scroll lands.
        timeout = setTimeout(() => {
          setIndex(0);
          setPosition(0, false);
        }, transition);
      }

      return () => clearTimeout(timeout);
    }, [wasReset, lines, index, indexProp, cyclic]);

    // Auto-advance.
    const lastUpdatedRef = useRef(Date.now());
    useEffect(() => {
      if (!autoAdvance) {
        return;
      }

      let interval: ReturnType<typeof setInterval> | undefined;
      const next = () => {
        setIndex((prev) => {
          const next = Math.min(prev + 1, lines.length);
          if (next >= lines.length && !cyclic) {
            clearInterval(interval);
            return prev;
          }

          return next;
        });
      };

      if (wasReset) {
        setIndex(greedy ? Math.max(0, lines.length - 1) : 0);
      } else {
        const now = Date.now();
        const wasVisible = now - lastUpdatedRef.current >= minDuration;
        lastUpdatedRef.current = now;
        if (wasVisible) {
          next();
        }
      }

      interval = setInterval(next, minDuration);
      return () => clearInterval(interval);
    }, [lines, wasReset, indexProp, autoAdvance, greedy, minDuration, cyclic, transition]);

    const rootStyle: CSSProperties & CSSVariables = { ...style, '--nx-text-crawl-duration': `${transition}ms` };
    const shown = (line: number) => index === line || (line === 0 && index === lines.length);

    return (
      <div
        {...props}
        data-scope='text-crawl'
        data-part='root'
        style={rootStyle}
        className={mx(recipes.textCrawl(), classNames)}
        ref={forwardedRef}
      >
        <div data-scope='text-crawl' data-part='ribbon' className={recipes.textCrawlRibbon()} ref={ribbonRef}>
          {lines.map((line, i) => (
            <div
              key={i}
              data-scope='text-crawl'
              data-part='line'
              data-active={shown(i) ? '' : undefined}
              aria-hidden={shown(i) ? undefined : true}
              className={recipes.textCrawlLine()}
            >
              {line}
            </div>
          ))}
          {cyclic && lines.length > 0 && (
            <div
              data-scope='text-crawl'
              data-part='line'
              data-active={index === lines.length || index === 0 ? '' : undefined}
              aria-hidden
              className={recipes.textCrawlLine()}
            >
              {lines[0]}
            </div>
          )}
        </div>
      </div>
    );
  },
);

TextCrawl.displayName = 'Next.TextCrawl';
