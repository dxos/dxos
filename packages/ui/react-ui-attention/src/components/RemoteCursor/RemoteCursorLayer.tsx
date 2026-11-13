//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { RemoteCursor } from './RemoteCursor.tsx';

export type CursorPoint = { x: number; y: number };

/**
 * Maps between the layer's pixels and the surface's own coordinates (a scene's world, an svg's viewBox, a map's
 * lat/lng), which peers share. Either returns `undefined` while the surface is not laid out.
 */
export type CursorProjection = {
  fromLayer: (point: CursorPoint, layer: HTMLElement) => CursorPoint | undefined;
  toLayer: (point: CursorPoint, layer: HTMLElement) => CursorPoint | undefined;
};

export type LayerCursor = CursorPoint & { id: string; name: string; hue: string };

export type RemoteCursorLayerProps = {
  /** Other collaborators' pointers, in surface coordinates. */
  cursors: readonly LayerCursor[];
  /** Pass a new projection when the surface's transform changes, so the cursors are placed again. */
  projection: CursorProjection;
  /** The local pointer moved over the surface (in surface coordinates), or left it (`undefined`). */
  onPointerChange?: (point: CursorPoint | undefined) => void;
};

/**
 * Collaborators' pointers over any surface, and the local one reported back. Renders as a cover over its parent,
 * which must be positioned and contain the surface; the parent's pointer events are what it tracks.
 */
export const RemoteCursorLayer = ({ cursors, projection, onPointerChange }: RemoteCursorLayerProps) => {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const latest = useRef({ projection, onPointerChange });
  latest.current = { projection, onPointerChange };
  // A resize moves the surface under the layer without a new projection.
  const [, setLayout] = useState(0);

  // A new projection renders before its surface reaches the DOM, so place the cursors again once it has.
  useLayoutEffect(() => setLayout((layout) => layout + 1), [projection]);

  useEffect(() => {
    const root = layer?.parentElement;
    if (!layer || !root) {
      return;
    }

    const handleMove = (event: PointerEvent) => {
      const rect = layer.getBoundingClientRect();
      const point = latest.current.projection.fromLayer(
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        layer,
      );
      if (point) {
        latest.current.onPointerChange?.(point);
      }
    };
    const handleLeave = () => latest.current.onPointerChange?.(undefined);
    const observer = new ResizeObserver(() => setLayout((layout) => layout + 1));

    root.addEventListener('pointermove', handleMove, { passive: true });
    root.addEventListener('pointerleave', handleLeave);
    observer.observe(root);
    return () => {
      root.removeEventListener('pointermove', handleMove);
      root.removeEventListener('pointerleave', handleLeave);
      observer.disconnect();
      handleLeave();
    };
  }, [layer]);

  return (
    <div ref={setLayer} role='none' className='dx-cover overflow-hidden pointer-events-none'>
      {layer &&
        cursors.map((cursor) => {
          const point = projection.toLayer(cursor, layer);
          return point ? (
            <RemoteCursor key={cursor.id} name={cursor.name} hue={cursor.hue} x={point.x} y={point.y} />
          ) : null;
        })}
    </div>
  );
};
