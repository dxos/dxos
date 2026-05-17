//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { mx } from '@dxos/ui-theme';

export type LoopMarkersProps = {
  /** Loop start in beats. */
  loopStart: number;
  /** Loop end in beats (exclusive). */
  loopEnd: number;
  /** Maximum loop end allowed, in beats (typically sequence length). */
  maxBeats: number;
  /** Minimum increment when dragging, in beats. Defaults to a 16th note (0.25). */
  step?: number;
  /** Pixel width of one beat at the current zoom. */
  pixelsPerBeat: number;
  /** Horizontal scroll offset of the grid, in pixels. */
  scrollX: number;
  /** Left header width (the frozen pitch-label column). */
  headerLeft: number;
  /** Height of the top ruler, in pixels — used to size the drag handles. */
  headerTop: number;
  /** Total height of the grid pane (for the shaded "outside loop" overlay). */
  paneHeight: number;
  /** Called when the user drags either handle. */
  onChange: (loopStart: number, loopEnd: number) => void;
};

const HANDLE_WIDTH = 8;

/**
 * Two draggable handles on top of the timeline marking the playback loop range,
 * plus a translucent shaded overlay outside the loop. The range applies to every
 * track in the Song.
 */
export const LoopMarkers = ({
  loopStart,
  loopEnd,
  maxBeats,
  step = 0.25,
  pixelsPerBeat,
  scrollX,
  headerLeft,
  headerTop,
  paneHeight,
  onChange,
}: LoopMarkersProps) => {
  const dragStateRef = useRef<{ which: 'start' | 'end'; initialClientX: number; initialBeats: number } | null>(null);

  const beatsToX = useCallback(
    (beats: number) => headerLeft + beats * pixelsPerBeat - scrollX,
    [headerLeft, pixelsPerBeat, scrollX],
  );

  const handlePointerDown = useCallback(
    (which: 'start' | 'end') => (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // setPointerCapture throws for synthetic events; drag still works via window-level listeners.
      }
      dragStateRef.current = {
        which,
        initialClientX: event.clientX,
        initialBeats: which === 'start' ? loopStart : loopEnd,
      };
    },
    [loopStart, loopEnd],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      if (!state) {
        return;
      }
      const deltaPx = event.clientX - state.initialClientX;
      const deltaBeats = deltaPx / pixelsPerBeat;
      const stepped = Math.round((state.initialBeats + deltaBeats) / step) * step;
      const clamped = Math.max(0, Math.min(maxBeats, stepped));
      if (state.which === 'start') {
        onChange(Math.min(clamped, loopEnd - step), loopEnd);
      } else {
        onChange(loopStart, Math.max(clamped, loopStart + step));
      }
    },
    [pixelsPerBeat, step, maxBeats, loopStart, loopEnd, onChange],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Best-effort; safe to ignore.
    }
  }, []);

  const startX = beatsToX(loopStart);
  const endX = beatsToX(loopEnd);
  const gridLeft = headerLeft;
  const gridWidth = Math.max(0, endX - startX);

  return (
    <div className='absolute inset-0 pointer-events-none' aria-hidden>
      {/* Shaded overlay outside the loop range — only over the cell area, not the headers. */}
      {startX > gridLeft && (
        <div
          className='absolute bg-black/30 dark:bg-black/40'
          style={{
            top: headerTop,
            left: gridLeft,
            width: Math.max(0, startX - gridLeft),
            height: Math.max(0, paneHeight - headerTop),
          }}
        />
      )}
      <div
        className='absolute bg-black/30 dark:bg-black/40'
        style={{ top: headerTop, left: endX, right: 0, height: Math.max(0, paneHeight - headerTop) }}
      />
      {/* Subtle highlight on the in-range cell area. */}
      <div
        className='absolute border-y border-primary-500/40'
        style={{
          top: headerTop,
          left: startX,
          width: gridWidth,
          height: Math.max(0, paneHeight - headerTop),
        }}
      />

      {/* Draggable handles in the ruler row. */}
      <div
        className={mx(
          'absolute top-0 pointer-events-auto cursor-ew-resize',
          'bg-primary-500 hover:bg-primary-400 active:bg-primary-300',
        )}
        style={{ left: startX - HANDLE_WIDTH / 2, width: HANDLE_WIDTH, height: headerTop }}
        onPointerDown={handlePointerDown('start')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role='slider'
        aria-label='Loop start'
        aria-valuemin={0}
        aria-valuemax={maxBeats}
        aria-valuenow={loopStart}
      />
      <div
        className={mx(
          'absolute top-0 pointer-events-auto cursor-ew-resize',
          'bg-primary-500 hover:bg-primary-400 active:bg-primary-300',
        )}
        style={{ left: endX - HANDLE_WIDTH / 2, width: HANDLE_WIDTH, height: headerTop }}
        onPointerDown={handlePointerDown('end')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role='slider'
        aria-label='Loop end'
        aria-valuemin={0}
        aria-valuemax={maxBeats}
        aria-valuenow={loopEnd}
      />

      {/* Faint vertical guide lines extending from the handles into the cell area. */}
      <div
        className='absolute pointer-events-none bg-primary-500/40'
        style={{ left: startX, top: headerTop, width: 1, height: Math.max(0, paneHeight - headerTop) }}
      />
      <div
        className='absolute pointer-events-none bg-primary-500/40'
        style={{ left: endX, top: headerTop, width: 1, height: Math.max(0, paneHeight - headerTop) }}
      />
    </div>
  );
};
