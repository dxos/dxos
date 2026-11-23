//
// Copyright 2026 DXOS.org
//

import React, { type PointerEvent, useCallback, useMemo, useRef, useState } from 'react';

import { mx } from '@dxos/ui-theme';

import { type Chapter } from './types.ts';
import { formatClock } from './usePlayback.ts';

export type TimelineProps = {
  chapters: Chapter[];
  time: number;
  duration: number;
  current: number;
  onSeek: (time: number) => void;
};

type Span = { at: number; end: number; title: string; index?: number; intro?: boolean };

/** How far a key on the focused seek bar moves the head, in seconds. */
const KEY_STEP = 5;

/**
 * The seek bar, cut into one segment per chapter so a chapter reads as a place on the timeline; hovering names the
 * chapter under the pointer, and a click or drag seeks.
 */
export const Timeline = ({ chapters, time, duration, current, onSeek }: TimelineProps) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; time: number }>();
  const [dragging, setDragging] = useState(false);

  const spans = useMemo<Span[]>(() => {
    if (!chapters.length) {
      return [{ at: 0, end: duration, title: '' }];
    }
    const lead = chapters[0].at > 0.05 ? [{ at: 0, end: chapters[0].at, title: 'Intro', intro: true }] : [];
    const spans: Span[] = [];
    for (const [index, chapter] of chapters.entries()) {
      const previousEnd = spans.at(-1)?.end ?? chapter.at;
      // Time between chapters (a pause the trim kept) is still part of the video, so it gets an untitled span.
      if (chapter.at - previousEnd > 0.05) {
        spans.push({ at: previousEnd, end: chapter.at, title: '' });
      }
      spans.push({
        at: chapter.at,
        end: chapter.end ?? chapters[index + 1]?.at ?? duration,
        title: chapter.title,
        index,
      });
    }
    // A closing clip runs past the last chapter's end.
    const last = spans.at(-1)?.end ?? duration;
    const tail = duration - last > 0.05 ? [{ at: last, end: duration, title: '' }] : [];
    return [...lead, ...spans, ...tail];
  }, [chapters, duration]);

  const timeAt = useCallback(
    (event: PointerEvent) => {
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect || !rect.width) {
        return { x: 0, time: 0 };
      }
      const x = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
      return { x, time: (x / rect.width) * duration };
    },
    [duration],
  );

  const hovered = hover && spans.findLast((span) => hover.time + 0.05 >= span.at);

  return (
    <div
      ref={barRef}
      role='slider'
      tabIndex={0}
      aria-label='Seek'
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={formatClock(time)}
      className='relative h-8 cursor-pointer touch-none select-none rounded-xs dx-focus-ring'
      // A click seeks without taking focus, so the player's arrows still step chapters; Tab focuses it as a slider.
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        const target = {
          ArrowLeft: time - KEY_STEP,
          ArrowDown: time - KEY_STEP,
          ArrowRight: time + KEY_STEP,
          ArrowUp: time + KEY_STEP,
          Home: 0,
          End: duration,
        }[event.key];
        if (target !== undefined) {
          event.preventDefault();
          onSeek(target);
        }
      }}
      onPointerDown={(event) => {
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        onSeek(timeAt(event).time);
      }}
      onPointerMove={(event) => {
        const position = timeAt(event);
        setHover(position);
        if (dragging) {
          onSeek(position.time);
        }
      }}
      onPointerUp={() => setDragging(false)}
      onPointerLeave={() => setHover(undefined)}
    >
      <div className='absolute inset-x-0 top-2.5 bottom-2.5'>
        {spans.map((span) => {
          const length = Math.max(0.001, span.end - span.at);
          const fraction = Math.min(1, Math.max(0, (time - span.at) / length));
          // Placed by time rather than laid out in a row, so the gap between segments takes no width from the clock.
          return (
            <div
              key={`${span.at}-${span.title}`}
              style={{ left: `${(span.at / (duration || 1)) * 100}%`, width: `${(length / (duration || 1)) * 100}%` }}
              className='absolute inset-y-0 px-0.5'
            >
              <div
                className={mx(
                  'relative h-full overflow-hidden rounded-xs bg-input-surface',
                  (span.index === current || (span.intro && current < 0)) && 'bg-current-surface',
                )}
              >
                <div className='absolute inset-y-0 start-0 bg-accent-bg' style={{ width: `${fraction * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div
        className='pointer-events-none absolute inset-y-1 w-0.5 -ms-px rounded-full bg-fg'
        style={{ left: `${duration ? (time / duration) * 100 : 0}%` }}
      />
      {hover && (
        <div
          className='pointer-events-none absolute bottom-9 -translate-x-1/2 truncate rounded-sm bg-popover-surface px-2 py-1 text-sm text-fg shadow-md max-w-80'
          style={{ left: hover.x }}
        >
          <span className='font-mono text-fg-muted'>{formatClock(hover.time)}</span>
          {hovered?.title && ` · ${hovered.index !== undefined ? `${hovered.index + 1}. ` : ''}${hovered.title}`}
        </div>
      )}
    </div>
  );
};
