//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type AllowedAxis } from '@dxos/ui-types';

import { type ScrollbarDensity } from './scrollbar.ts';

/** Smallest rendered thumb so it stays grabbable on very long content. */
const MIN_THUMB = 24;

type ThumbGeometry = {
  visible: boolean;
  offset: number;
  length: number;
};

const HIDDEN: ThumbGeometry = { visible: false, offset: 0, length: 0 };

/**
 * Project scroll state onto a track of `viewportLength`, inset by `padding` at both ends.
 */
export const measure = (
  scrollOffset: number,
  scrollLength: number,
  viewportLength: number,
  padding: number,
): ThumbGeometry => {
  const overflow = scrollLength - viewportLength;
  if (overflow <= 1) {
    return HIDDEN;
  }

  const track = viewportLength - padding * 2;
  // A viewport too short to seat the minimum thumb would otherwise place it past the far edge.
  if (track <= MIN_THUMB) {
    return HIDDEN;
  }

  const length = Math.min(track, Math.max(MIN_THUMB, (viewportLength / scrollLength) * track));
  const offset = padding + (scrollOffset / overflow) * (track - length);
  return { visible: true, offset, length };
};

type ScrollAreaThumbsProps = {
  viewport: HTMLElement;
  orientation: AllowedAxis;
  density: ScrollbarDensity;
  autoHide: boolean;
};

/**
 * Absolutely positioned thumbs painted over the viewport; the viewport keeps native scrolling
 * (its own scrollbars are hidden via CSS), so scroll chaining and nesting behave as the browser
 * intends. Must be rendered as a sibling of the viewport inside a positioned root.
 */
export const ScrollAreaThumbs = ({ viewport, orientation, density, autoHide }: ScrollAreaThumbsProps) => {
  const [vertical, setVertical] = useState<ThumbGeometry>(HIDDEN);
  const [horizontal, setHorizontal] = useState<ThumbGeometry>(HIDDEN);
  const [dragging, setDragging] = useState<AllowedAxis | undefined>();

  const showVertical = orientation === 'vertical' || orientation === 'all';
  const showHorizontal = orientation === 'horizontal' || orientation === 'all';

  const update = useCallback(() => {
    setVertical(
      showVertical
        ? measure(viewport.scrollTop, viewport.scrollHeight, viewport.clientHeight, density.padding)
        : HIDDEN,
    );
    setHorizontal(
      showHorizontal
        ? measure(viewport.scrollLeft, viewport.scrollWidth, viewport.clientWidth, density.padding)
        : HIDDEN,
    );
  }, [viewport, showVertical, showHorizontal, density.padding]);

  useEffect(() => {
    // Observe the scrolled content too, since content growth does not resize the viewport; the
    // set of children is re-synced on mutation so appended content is measured as it arrives.
    const resize = new ResizeObserver(update);
    const observeContent = () => {
      resize.disconnect();
      resize.observe(viewport);
      Array.from(viewport.children).forEach((child) => resize.observe(child));
      update();
    };

    observeContent();
    const mutation = new MutationObserver(observeContent);
    mutation.observe(viewport, { childList: true });
    viewport.addEventListener('scroll', update, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', update);
      mutation.disconnect();
      resize.disconnect();
    };
  }, [viewport, update]);

  // Read current geometry during a drag without re-binding the move handler on every frame.
  const verticalRef = useRef(vertical);
  const horizontalRef = useRef(horizontal);
  verticalRef.current = vertical;
  horizontalRef.current = horizontal;

  const drag = useRef<{ origin: number; scroll: number } | undefined>(undefined);

  const handlePointerDown = useCallback(
    (axis: AllowedAxis) => (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        origin: axis === 'vertical' ? event.clientY : event.clientX,
        scroll: axis === 'vertical' ? viewport.scrollTop : viewport.scrollLeft,
      };
      setDragging(axis);
    },
    [viewport],
  );

  const handlePointerMove = useCallback(
    (axis: AllowedAxis) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current) {
        return;
      }

      const isVertical = axis === 'vertical';
      const viewportLength = isVertical ? viewport.clientHeight : viewport.clientWidth;
      const scrollLength = isVertical ? viewport.scrollHeight : viewport.scrollWidth;
      const thumb = isVertical ? verticalRef.current : horizontalRef.current;
      const track = viewportLength - density.padding * 2 - thumb.length;
      if (track <= 0) {
        return;
      }

      const delta = (isVertical ? event.clientY : event.clientX) - drag.current.origin;
      const scroll = drag.current.scroll + (delta / track) * (scrollLength - viewportLength);
      if (isVertical) {
        viewport.scrollTop = scroll;
      } else {
        viewport.scrollLeft = scroll;
      }
    },
    [viewport, density.padding],
  );

  // Also bound to pointercancel and lostpointercapture: without them an interrupted drag leaves
  // `drag` set, and the next hover-move over the thumb would scroll with no button held.
  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    drag.current = undefined;
    setDragging(undefined);
  }, []);

  const visibility =
    autoHide && !dragging
      ? mx(
          'opacity-0 transition-opacity',
          orientation === 'vertical' && 'group-hover/scroll-v:opacity-100',
          orientation === 'horizontal' && 'group-hover/scroll-h:opacity-100',
          orientation === 'all' && 'group-hover/scroll-all:opacity-100',
        )
      : 'opacity-100';

  // A captured pointer keeps `:active` on the thumb only while the cursor stays over it,
  // so the dragged state is driven by `dragging` instead.
  const appearance = (axis: AllowedAxis) =>
    mx(
      'absolute z-10 touch-none cursor-default transition-colors',
      dragging === axis ? 'bg-scrollbar-thumb-active' : 'bg-scrollbar-thumb hover:bg-scrollbar-thumb-hover',
    );

  return (
    <>
      {vertical.visible && (
        <div
          className={mx(appearance('vertical'), visibility)}
          style={{
            width: density.size,
            height: vertical.length,
            top: vertical.offset,
            insetInlineEnd: 0,
          }}
          onPointerDown={handlePointerDown('vertical')}
          onPointerMove={handlePointerMove('vertical')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        />
      )}
      {horizontal.visible && (
        <div
          className={mx(appearance('horizontal'), visibility)}
          style={{
            height: density.size,
            width: horizontal.length,
            insetInlineStart: horizontal.offset,
            bottom: density.padding,
          }}
          onPointerDown={handlePointerDown('horizontal')}
          onPointerMove={handlePointerMove('horizontal')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        />
      )}
    </>
  );
};
