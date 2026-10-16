//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type PointerEvent, useCallback, useRef } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

export type TimelineBarProps = Util.ThemedClassName<{
  /** Seconds. */
  time: number;
  duration: number;
  playing: boolean;
  fps: number;
  /** Times of the selection's keys, drawn as diamonds on the track. */
  keys?: readonly number[];
  autoKey?: boolean;
  readonly?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  onTimeChange?: (time: number) => void;
  onAutoKeyChange?: (autoKey: boolean) => void;
  /** Keys the selection's animatable properties at the playhead; offered while something is selected. */
  onAddKey?: () => void;
  /** Removes the selection's keys at the playhead; offered while the playhead is on one. */
  onRemoveKey?: () => void;
}>;

/** The key at time `t`, if one is within half a frame of it. */
export const keyAt = (keys: readonly number[], t: number, fps: number): number | undefined =>
  keys.find((key) => Math.abs(key - t) < 0.5 / fps);

/** `t` as `s.ff`, seconds and frames, as an editor's timecode reads. */
export const formatTime = (t: number, fps: number): string => {
  const frame = Math.round(t * fps);
  const seconds = Math.floor(frame / fps);
  return `${seconds}.${String(frame % fps).padStart(2, '0')}`;
};

/**
 * The collapsed timeline (ANIMATION.md §5.8): play and pause, a track to scrub the playhead along with the selection's
 * keys on it, the time, the key toggle and the auto-key toggle. Dragging the track scrubs; clicking a diamond moves the
 * playhead to it. On the track, the arrows step a frame (with Shift, a second), ⌘ or Ctrl with an arrow jumps to the
 * previous or next key, and Delete removes the key under the playhead.
 */
export const TimelineBar = ({
  classNames,
  time,
  duration,
  playing,
  fps,
  keys = [],
  autoKey,
  readonly,
  onPlayingChange,
  onTimeChange,
  onAutoKeyChange,
  onAddKey,
  onRemoveKey,
}: TimelineBarProps) => {
  const current = keyAt(keys, time, fps);
  const trackRef = useRef<HTMLDivElement>(null);
  const timeAt = useCallback(
    (clientX: number) => {
      const track = trackRef.current?.getBoundingClientRect();
      if (!track || track.width === 0 || duration <= 0) {
        return 0;
      }
      // On the frame grid, so a scrub lands where frame stepping and export would.
      const raw = ((clientX - track.left) / track.width) * duration;
      return Math.min(duration, Math.max(0, Math.round(raw * fps) / fps));
    },
    [duration, fps],
  );
  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onPlayingChange?.(false);
      onTimeChange?.(timeAt(event.clientX));
    },
    [onPlayingChange, onTimeChange, timeAt],
  );
  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        onTimeChange?.(timeAt(event.clientX));
      }
    },
    [onTimeChange, timeAt],
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        const back = event.key === 'ArrowLeft';
        if (event.metaKey || event.ctrlKey) {
          const target = back
            ? [...keys].reverse().find((key) => key < time - 0.5 / fps)
            : keys.find((key) => key > time + 0.5 / fps);
          if (target !== undefined) {
            onTimeChange?.(target);
          }
          return;
        }
        const step = event.shiftKey ? 1 : 1 / fps;
        onTimeChange?.(Math.min(duration, Math.max(0, time + (back ? -step : step))));
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && current !== undefined && onRemoveKey) {
        event.preventDefault();
        event.stopPropagation();
        onRemoveKey();
      }
    },
    [time, duration, fps, keys, current, onTimeChange, onRemoveKey],
  );
  const at = (t: number) => `${duration > 0 ? (t / duration) * 100 : 0}%`;
  return (
    <Toolbar.Root classNames={mx('min-w-[24rem]', classNames)} data-testid='timeline'>
      <Button.Root
        variant='ghost'
        iconOnly
        icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
        label={playing ? 'Pause' : 'Play'}
        data-testid='timeline-play'
        onClick={() => {
          // Played from the end, the timeline starts over.
          if (!playing && time >= duration) {
            onTimeChange?.(0);
          }
          onPlayingChange?.(!playing);
        }}
      />
      <div
        ref={trackRef}
        role='slider'
        tabIndex={0}
        aria-label='Playhead'
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={time}
        aria-valuetext={`${formatTime(time, fps)} s`}
        className='relative grow h-6 mx-2 cursor-pointer touch-none dx-focus-ring rounded-xs'
        data-testid='timeline-track'
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <div className='absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-separator rounded-full' />
        <div
          className='absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-accent-bg rounded-full'
          style={{ width: at(time) }}
        />
        {keys.map((key) => (
          <button
            key={key}
            type='button'
            aria-label={`Key at ${formatTime(key, fps)} s`}
            className={mx(
              'absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-separator',
              key === current ? 'bg-amber-300 ring-1 ring-amber-300' : 'bg-amber-500',
            )}
            style={{ left: at(key) }}
            data-testid='timeline-key'
            onPointerDown={(event) => {
              event.stopPropagation();
              onPlayingChange?.(false);
              onTimeChange?.(key);
            }}
          />
        ))}
        <div
          className='absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-accent-bg pointer-events-none'
          style={{ left: at(time) }}
          data-testid='timeline-playhead'
        />
      </div>
      <span
        className='shrink-0 text-end text-sm whitespace-nowrap tabular-nums text-fg-muted'
        data-testid='timeline-time'
      >
        {formatTime(time, fps)} / {formatTime(duration, fps)}
      </span>
      {!readonly && (
        <>
          {/* One control: on a key it removes the key, elsewhere it adds one. */}
          <Button.Root
            variant='ghost'
            iconOnly
            icon={current !== undefined ? 'ph--diamond--fill' : 'ph--diamond--regular'}
            label={current !== undefined ? 'Remove key (Delete)' : 'Add key (K)'}
            disabled={current !== undefined ? !onRemoveKey : !onAddKey}
            data-testid='timeline-toggle-key'
            data-state={current !== undefined ? 'on' : 'off'}
            onClick={current !== undefined ? onRemoveKey : onAddKey}
          />
          {/* The record dot says whether it is on; a pressed button's fill would shout over the bar. */}
          <Button.Root
            variant='ghost'
            iconOnly
            icon={autoKey ? 'ph--record--fill' : 'ph--record--regular'}
            label={autoKey ? 'Auto-key on: edits away from the start make keys' : 'Auto-key off'}
            classNames={autoKey ? 'text-error-text' : 'text-fg-muted'}
            data-testid='timeline-auto-key'
            data-state={autoKey ? 'on' : 'off'}
            onClick={() => onAutoKeyChange?.(!autoKey)}
          />
        </>
      )}
    </Toolbar.Root>
  );
};
