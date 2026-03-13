//
// Copyright 2024 DXOS.org
//

import type { TLRecord } from '@tldraw/tldraw';
import { isShape } from '@tldraw/tlschema';

import { createDocAccessor } from '@dxos/echo-db';

import type { Diagram } from '../types';
import { getDeep } from '../util';

/**
 * Snap to grid.
 */
export const handleSnap = async (sketch: Diagram.Diagram) => {
  const snap = (value: number, tolerance = 40) => {
    return Math.round(value / tolerance) * tolerance;
  };

  // TODO(burdon): Use context to access document.
  const accessor = createDocAccessor(sketch.canvas.target!, ['content']);
  accessor.handle.change((sketch) => {
    const map: Record<string, TLRecord> = getDeep(sketch, accessor.path);
    Object.entries(map ?? {}).forEach(([_id, item]) => {
      if (isShape(item)) {
        const { x, y, props } = item;
        item.x = snap(x);
        item.y = snap(y);
        type Rect = { geo: string; w: number; h: number };
        const { geo, w, h } = props as Rect;
        switch (geo) {
          case 'rectangle': {
            const rect = props as Rect;
            rect.w = snap(w);
            rect.h = snap(h);
          }
        }
      }
    });
  });
};
