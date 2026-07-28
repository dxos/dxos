//
// Copyright 2024 DXOS.org
//

import type { TLRecord } from '@tldraw/tldraw';
import { isShape } from '@tldraw/tlschema';

import { Doc } from '@dxos/echo-doc';
import { getDeep } from '@dxos/util';

import type { Tldraw } from '#types';

/**
 * Snap to grid.
 */
export const handleSnap = async (canvas: Tldraw.Canvas) => {
  const snap = (value: number, tolerance = 40) => {
    return Math.round(value / tolerance) * tolerance;
  };

  // TODO(burdon): Use context to access document.
  const accessor = Doc.createAccessor(canvas, ['content']);
  accessor.handle.change((doc) => {
    const map = getDeep<Record<string, TLRecord>>(doc, accessor.path);
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
