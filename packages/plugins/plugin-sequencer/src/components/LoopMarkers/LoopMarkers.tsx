//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

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
  /** Called when the user drags near the right/left edge while the handle is past
   * the visible viewport. Implementations should mutate viewport.scrollX. */
  onScrollX?: (deltaPx: number) => void;
  /** Left header width (the frozen pitch-label column). */
  headerLeft: number;
  /** Height of the top ruler, in pixels — used to size the drag handles. */
  headerTop: number;
  /** Total height of the grid pane (for the shaded "outside loop" overlay). */
  paneHeight: number;
  /** Pane width, used for auto-scroll edge detection during drag. */
  paneWidth: number;
  /** Called when the user drags either handle. */
  onChange: (loopStart: number, loopEnd: number) => void;
};

const HANDLE_WIDTH = 8;
// Distance from the pane edge at which auto-scroll kicks in while dragging.
const AUTOSCROLL_EDGE_PX = 32;
const AUTOSCROLL_SPEED_PX_PER_FRAME = 12;

/**
 * Two draggable handles on top of the timeline marking the playback loop range,
 * plus a translucent shaded overlay outside the loop. The range applies to every
 * track in the Score.
 */
export const LoopMarkers = ({
  loopStart,
  loopEnd,
  maxBeats,
  step = 0.25,
  pixelsPerBeat,
  scrollX,
  onScrollX,
  headerLeft,
  headerTop,
  paneHeight,
  paneWidth,
  onChange,
}: LoopMarkersProps) => {
  // The container ref lets us translate pointer client coordinates into pane-local x
  // even after the pointer leaves the handle (window-level move listener).
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [draggingWhich, setDraggingWhich] = useState<'start' | 'end' | null>(null);

  // Mirror the latest loop values into refs so the window listener — set up once
  // per drag — always reads current values without re-binding.
  const loopStartRef = useRef(loopStart);
  const loopEndRef = useRef(loopEnd);
  loopStartRef.current = loopStart;
  loopEndRef.current = loopEnd;

  const beatsToX = useCallback(
    (beats: number) => headerLeft + beats * pixelsPerBeat - scrollX,
    [headerLeft, pixelsPerBeat, scrollX],
  );

  const handlePointerDown = useCallback(
    (which: 'start' | 'end') => (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingWhich(which);
    },
    [],
  );

  // Window-level drag: once a handle is grabbed, listen for pointermove/up on the
  // window so the drag continues even when the pointer leaves the (potentially
  // off-screen) handle. Also auto-scroll the grid when dragging near the right
  // edge so the user can reach loop positions beyond the visible viewport.
  useEffect(() => {
    if (!draggingWhich) {
      return;
    }
    const root = rootRef.current;
    if (!root) {
      return;
    }
    let autoScrollRaf = 0;
    let autoScrollDx = 0;

    const tickAutoScroll = () => {
      if (autoScrollDx !== 0 && onScrollX) {
        onScrollX(autoScrollDx);
      }
      autoScrollRaf = requestAnimationFrame(tickAutoScroll);
    };

    const applyAtClientX = (clientX: number) => {
      const rect = root.getBoundingClientRect();
      // Translate to a pane-local pixel position, then to beats — this is more
      // robust than tracking pointerdown deltas because it survives auto-scroll
      // mutating scrollX mid-drag.
      const localX = clientX - rect.left;
      const beats = (localX - headerLeft + scrollX) / pixelsPerBeat;
      const stepped = Math.round(beats / step) * step;
      const clamped = Math.max(0, Math.min(maxBeats, stepped));
      if (draggingWhich === 'start') {
        onChange(Math.min(clamped, loopEndRef.current - step), loopEndRef.current);
      } else {
        onChange(loopStartRef.current, Math.max(clamped, loopStartRef.current + step));
      }
    };

    const onMove = (event: PointerEvent) => {
      event.preventDefault();
      applyAtClientX(event.clientX);

      // Auto-scroll when the pointer is near the right/left edge of the pane.
      const rect = root.getBoundingClientRect();
      const distFromRight = rect.right - event.clientX;
      const distFromLeft = event.clientX - (rect.left + headerLeft);
      if (distFromRight < AUTOSCROLL_EDGE_PX) {
        autoScrollDx = AUTOSCROLL_SPEED_PX_PER_FRAME;
      } else if (distFromLeft < AUTOSCROLL_EDGE_PX && distFromLeft > -AUTOSCROLL_EDGE_PX) {
        autoScrollDx = -AUTOSCROLL_SPEED_PX_PER_FRAME;
      } else {
        autoScrollDx = 0;
      }
    };

    const onUp = () => {
      setDraggingWhich(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    autoScrollRaf = requestAnimationFrame(tickAutoScroll);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      cancelAnimationFrame(autoScrollRaf);
    };
  }, [draggingWhich, headerLeft, pixelsPerBeat, scrollX, step, maxBeats, onChange, onScrollX]);

  // Positions inside the clip container are pane-x minus headerLeft, since the
  // clip container starts at left: headerLeft. This keeps every marker visual
  // confined to the cell area — nothing can bleed left of the frozen pitch-
  // label column or into the TrackList pane to its left.
  const cellAreaStartX = beatsToX(loopStart) - headerLeft;
  const cellAreaEndX = beatsToX(loopEnd) - headerLeft;
  const gridWidth = Math.max(0, cellAreaEndX - cellAreaStartX);

  // paneWidth is currently unused but accepted so callers can pass it without
  // a prop-warning; future enhancements may use it for edge-distance computations.
  void paneWidth;

  return (
    <div ref={rootRef} className='absolute inset-0 pointer-events-none' aria-hidden>
      {/* Single clip container so markers cannot bleed into the frozen pitch-
          label column (left of headerLeft) or, beyond that, the TrackList. */}
      <div
        className='absolute pointer-events-none overflow-hidden'
        style={{ top: 0, left: headerLeft, right: 0, bottom: 0 }}
      >
        {/* Shaded overlay outside the loop range — only over the cell area, not the headers. */}
        {cellAreaStartX > 0 && (
          <div
            className='absolute bg-black/30 dark:bg-black/40'
            style={{
              top: headerTop,
              left: 0,
              width: cellAreaStartX,
              height: Math.max(0, paneHeight - headerTop),
            }}
          />
        )}
        <div
          className='absolute bg-black/30 dark:bg-black/40'
          style={{
            top: headerTop,
            left: Math.max(0, cellAreaEndX),
            right: 0,
            height: Math.max(0, paneHeight - headerTop),
          }}
        />
        {/* Subtle highlight on the in-range cell area. */}
        <div
          className='absolute border-y border-primary-500/40'
          style={{
            top: headerTop,
            left: cellAreaStartX,
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
          style={{ left: cellAreaStartX - HANDLE_WIDTH / 2, width: HANDLE_WIDTH, height: headerTop }}
          onPointerDown={handlePointerDown('start')}
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
          style={{ left: cellAreaEndX - HANDLE_WIDTH / 2, width: HANDLE_WIDTH, height: headerTop }}
          onPointerDown={handlePointerDown('end')}
          role='slider'
          aria-label='Loop end'
          aria-valuemin={0}
          aria-valuemax={maxBeats}
          aria-valuenow={loopEnd}
        />

        {/* Faint vertical guide lines extending from the handles into the cell area. */}
        <div
          className='absolute pointer-events-none bg-primary-500/40'
          style={{ left: cellAreaStartX, top: headerTop, width: 1, height: Math.max(0, paneHeight - headerTop) }}
        />
        <div
          className='absolute pointer-events-none bg-primary-500/40'
          style={{ left: cellAreaEndX, top: headerTop, width: 1, height: Math.max(0, paneHeight - headerTop) }}
        />
      </div>
    </div>
  );
};
