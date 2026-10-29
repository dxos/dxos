//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type PointerEvent, useCallback, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Menu from '@dxos/react-ui/Menu';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { FLOATING_BAR } from '../../../utils/index.ts';
import { type PanelProps } from '../types.ts';

export type TimelinePanelProps = PanelProps & {
  /** Seconds. */
  time: number;
  duration: number;
  playing: boolean;
  fps: number;
  /** Times of the selection's keys, drawn as diamonds on the track. */
  keys?: readonly number[];
  autoKey?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  onTimeChange?: (time: number) => void;
  onAutoKeyChange?: (autoKey: boolean) => void;
  /** Keys the selection's animatable properties at the playhead; offered while something is selected. */
  onAddKey?: () => void;
  /** Removes the selection's keys at the playhead; offered while the playhead is on one. */
  onRemoveKey?: () => void;
  /** Moves the selection's keys at `from` to `to`; offered, a diamond drags along the track. */
  onMoveKey?: (from: number, to: number) => void;
};

/** The timeline's controls show no focus ring: focus is visible as the playhead and keys respond to the keyboard. */
const NO_RING = 'focus-visible:ring-0';

/** The key at time `t`, if one is within half a frame of it. */
export const keyAt = (keys: readonly number[], t: number, fps: number): number | undefined =>
  keys.find((key) => Math.abs(key - t) < 0.5 / fps);

/** Where Cmd with an arrow goes from `t`: the next (or previous) key, else the end (or start) when there is none that way. */
export const jumpTarget = (keys: readonly number[], t: number, fps: number, duration: number, back: boolean): number =>
  (back ? [...keys].reverse().find((key) => key < t - 0.5 / fps) : keys.find((key) => key > t + 0.5 / fps)) ??
  (back ? 0 : duration);

/** `t` as `s.ff`, seconds and frames, as an editor's timecode reads. */
export const formatTime = (t: number, fps: number): string => {
  const frame = Math.round(t * fps);
  const seconds = Math.floor(frame / fps);
  return `${seconds}.${String(frame % fps).padStart(2, '0')}`;
};

/**
 * The collapsed timeline (ANIMATION.md §5.8): play and pause, a track to scrub the playhead along with the selection's
 * keys on it, the time, the key toggle and the auto-key toggle. Dragging the track scrubs; clicking a diamond moves the
 * playhead to it. On the track, the arrows step a frame (with Shift, a second), Cmd or Ctrl with an arrow jumps to the
 * previous or next key (the start or end when there is none that way), and Delete removes the key under the playhead. On the play button, Left and Right jump to the
 * keys (or ends) with Cmd or Ctrl and scrub otherwise, Enter keys the playhead, Delete removes the key there and Space plays and pauses.
 */
export const TimelinePanel = ({
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
  onMoveKey,
}: TimelinePanelProps) => {
  const current = keyAt(keys, time, fps);
  // The key being dragged and where it would land; a press that never moves stays a click that seeks.
  const [dragging, setDragging] = useState<{ from: number; to: number }>();
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
          onTimeChange?.(jumpTarget(keys, time, fps, duration, back));
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
    <Toolbar.Root classNames={mx('min-w-[24rem]', FLOATING_BAR, classNames)} data-testid='timeline'>
      <Button.Root
        variant='ghost'
        iconOnly
        classNames={NO_RING}
        icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
        label={playing ? 'Pause' : 'Play'}
        data-testid='timeline-play'
        // Focused, the button drives the playhead and keys: Left and Right scrub a frame (Shift, a second), with Cmd or
        // Ctrl they jump to the next key, or the end when there is none; Enter keys the playhead (unless it is on a key)
        // and Delete removes the key there. Space, the button's own key, plays and pauses.
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            onPlayingChange?.(false);
            const back = event.key === 'ArrowLeft';
            if (event.metaKey || event.ctrlKey) {
              onTimeChange?.(jumpTarget(keys, time, fps, duration, back));
            } else {
              const step = event.shiftKey ? 1 : 1 / fps;
              onTimeChange?.(Math.min(duration, Math.max(0, time + (back ? -step : step))));
            }
          } else if (event.key === 'Enter') {
            // Enter keys rather than presses: preventing it here keeps the button from playing.
            event.preventDefault();
            event.stopPropagation();
            if (current === undefined && onAddKey && !readonly) {
              onAddKey();
            }
          } else if ((event.key === 'Delete' || event.key === 'Backspace') && current !== undefined && onRemoveKey) {
            event.preventDefault();
            event.stopPropagation();
            onRemoveKey();
          }
        }}
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
        className='relative grow h-6 mx-2 cursor-pointer touch-none outline-none rounded-xs'
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
        {keys.map((key) => {
          const shown = dragging?.from === key ? dragging.to : key;
          return (
            <button
              key={key}
              type='button'
              aria-label={`Key at ${formatTime(key, fps)} s`}
              className={mx(
                'absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-separator',
                onMoveKey && !readonly && 'cursor-ew-resize',
                key === current || dragging?.from === key ? 'bg-amber-300 ring-1 ring-amber-300' : 'bg-amber-500',
              )}
              style={{ left: at(shown) }}
              data-testid='timeline-key'
              onPointerDown={(event) => {
                event.stopPropagation();
                onPlayingChange?.(false);
                onTimeChange?.(key);
                if (onMoveKey && !readonly) {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging({ from: key, to: key });
                }
              }}
              onPointerMove={(event) => {
                if (dragging?.from === key) {
                  const to = timeAt(event.clientX);
                  setDragging({ from: key, to });
                  onTimeChange?.(to);
                }
              }}
              onPointerUp={() => {
                if (dragging?.from === key && dragging.to !== key) {
                  onMoveKey?.(key, dragging.to);
                }
                setDragging(undefined);
              }}
              onPointerCancel={() => setDragging(undefined)}
            />
          );
        })}
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
          {/* The less frequent actions, in one menu: the keyboard covers keying from the play button. */}
          <Menu.Root positioning={{ placement: 'top-end', gutter: 4 }}>
            <Menu.Trigger asChild>
              <Button.Root
                variant='ghost'
                iconOnly
                classNames={NO_RING}
                icon='ph--dots-three-vertical--regular'
                label='Timeline actions'
                data-testid='timeline-menu'
              />
            </Menu.Trigger>
            <Menu.Content>
              <Menu.Item
                item={{ value: 'add-key', label: 'Add key', shortcut: '\u21B5' }}
                disabled={current !== undefined || !onAddKey}
                data-testid='timeline-add-key'
                onSelect={() => onAddKey?.()}
              />
              <Menu.Item
                item={{ value: 'remove-key', label: 'Delete key', shortcut: '\u232B' }}
                disabled={current === undefined || !onRemoveKey}
                data-testid='timeline-remove-key'
                onSelect={() => onRemoveKey?.()}
              />
              <Menu.Separator />
              <Menu.CheckboxItem
                item={{ value: 'auto-key', label: 'Auto-key' }}
                checked={!!autoKey}
                data-testid='timeline-auto-key'
                onCheckedChange={(checked) => onAutoKeyChange?.(checked === true)}
              />
            </Menu.Content>
          </Menu.Root>
        </>
      )}
    </Toolbar.Root>
  );
};
