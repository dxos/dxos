//
// Copyright 2026 DXOS.org
//

import React, { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef } from 'react';

import { type ThemedClassName, useMainContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const SIDEBAR_RESIZE_HANDLE_NAME = 'SidebarResizeHandle';

/** Marks a drag in progress so every box keyed off the sidebar size drops its width transition. */
export const RESIZING_ATTRIBUTE = 'data-sidebar-resizing';

const getRem = (): number => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

export type SidebarResizeHandleProps = ThemedClassName<{
  /**
   * The `:root` custom property holding this sidebar's expanded width. The drag writes it there rather
   * than on the sidebar, because the theme derives further properties from it (`--dx-r1-size`) and a
   * derived property only recomputes on the element carrying its declaration.
   */
  property: string;
  /** The viewport edge the sidebar is pinned to; the drag grows it away from that edge. */
  side: 'inline-start' | 'inline-end';
  /** Committed width in rem. */
  size: number;
  minSize: number;
  maxSize: number;
  label: string;
  onSizeChange: (size: number) => void;
}>;

/**
 * Drag affordance on a sidebar's inner edge. React stays out of the drag loop: pointer moves write the
 * width property directly and only the released value is committed, so the deck reflows in step with
 * the pointer instead of trailing a state round-trip.
 */
export const SidebarResizeHandle = ({
  classNames,
  property,
  side,
  size,
  minSize,
  maxSize,
  label,
  onSizeChange,
}: SidebarResizeHandleProps) => {
  const { setResizing } = useMainContext(SIDEBAR_RESIZE_HANDLE_NAME);
  const origin = useRef<{ x: number; size: number } | null>(null);

  // Unmounting mid-drag (collapsing the sidebar from a shortcut) never delivers the pointer release,
  // which would otherwise strand the transition suppression on for the rest of the session.
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute(RESIZING_ATTRIBUTE);
    };
  }, []);

  const clamp = useCallback(
    (next: number) => {
      // A narrow viewport can drive the upper bound below the lower one; the minimum wins.
      const upper = Math.max(minSize, Math.min(maxSize, window.innerWidth / getRem() - minSize));
      return Math.min(Math.max(next, minSize), upper);
    },
    [minSize, maxSize],
  );

  const preview = useCallback(
    (next: number) => document.documentElement.style.setProperty(property, `${next}rem`),
    [property],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      origin.current = { x: event.clientX, size };
      document.documentElement.setAttribute(RESIZING_ATTRIBUTE, 'true');
      setResizing(true);
    },
    [size, setResizing],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const start = origin.current;
      if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }
      // Travel away from the pinned edge widens the sidebar, so an end-pinned one grows as the pointer
      // moves towards the start of the axis. Direction comes from the handle so the sign follows RTL.
      const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
      const towardsStart = (start.x - event.clientX) * (rtl ? -1 : 1);
      const delta = (side === 'inline-end' ? towardsStart : -towardsStart) / getRem();
      preview(clamp(start.size + delta));
    },
    [side, clamp, preview],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const committed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(property));
      document.documentElement.removeAttribute(RESIZING_ATTRIBUTE);
      setResizing(false);
      origin.current = null;
      if (Number.isFinite(committed) && committed !== size) {
        onSizeChange(clamp(committed));
      }
    },
    [property, size, clamp, onSizeChange, setResizing],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const step = event.shiftKey ? 4 : 1;
      const grow = side === 'inline-end' ? 'ArrowLeft' : 'ArrowRight';
      const shrink = side === 'inline-end' ? 'ArrowRight' : 'ArrowLeft';
      let next: number | undefined;
      if (event.key === grow) {
        next = size + step;
      } else if (event.key === shrink) {
        next = size - step;
      } else if (event.key === 'Home') {
        next = minSize;
      } else if (event.key === 'End') {
        next = maxSize;
      }
      if (next === undefined) {
        return;
      }
      event.preventDefault();
      const clamped = clamp(next);
      // Suppress the width transition for this step: the panel inside the sidebar is sized off a derived
      // property and snaps, so an animated shell would overhang it for the duration. The flush has to be
      // synchronous — deferring the reset to a frame callback lands before style recalc, so the
      // suppression would already be gone by the time the new width is computed.
      document.documentElement.setAttribute(RESIZING_ATTRIBUTE, 'true');
      preview(clamped);
      void document.documentElement.offsetWidth;
      document.documentElement.removeAttribute(RESIZING_ATTRIBUTE);
      onSizeChange(clamped);
    },
    [side, size, minSize, maxSize, clamp, preview, onSizeChange],
  );

  return (
    <div
      role='separator'
      tabIndex={0}
      aria-orientation='vertical'
      aria-label={label}
      aria-valuemin={Math.round(minSize)}
      aria-valuemax={Math.round(maxSize)}
      aria-valuenow={Math.round(size)}
      data-testid='complementarySidebar.resize'
      className={mx(
        'absolute z-10 inset-y-0 w-[7px] touch-none select-none cursor-col-resize',
        side === 'inline-end' ? 'start-0' : 'end-0',
        'before:absolute before:block before:inset-y-0 before:w-px',
        side === 'inline-end' ? 'before:start-0' : 'before:end-0',
        'before:transition-colors before:duration-100 before:ease-in-out',
        'hover:before:bg-focus-ring-subtle focus-visible:before:bg-focus-ring-subtle active:before:bg-focus-ring-subtle',
        classNames,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    />
  );
};

SidebarResizeHandle.displayName = SIDEBAR_RESIZE_HANDLE_NAME;
