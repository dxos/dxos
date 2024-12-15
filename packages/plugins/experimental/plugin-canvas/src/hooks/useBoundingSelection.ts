//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { bind } from 'bind-event-listener';
import { useEffect, useState } from 'react';

import { getRect, type Rect, type Point, type Range } from '../layout';

export type BoundingSelectionCallback = (bounds: Rect | null, shift?: boolean) => void;

/**
 * Event listener to track range bounds selection.
 */
export const useBoundingSelection = (el: HTMLElement | null, cb?: BoundingSelectionCallback): Rect | null => {
  const [range, setRange] = useState<Partial<Range>>();
  useEffect(() => {
    if (!el) {
      return;
    }

    return combine(
      bind(el, {
        type: 'keydown',
        listener: (ev) => {
          if (ev.key === 'Escape') {
            setRange(undefined);
          }
        },
      }),
      bind(el, {
        type: 'pointerdown',
        listener: (ev) => {
          if (ev.target !== el) {
            return false;
          }

          const p1: Point = { x: ev.clientX, y: ev.clientY };
          setRange({ p1 });
        },
      }),
      bind(el, {
        type: 'pointermove',
        listener: (ev) => {
          if (ev.target !== el) {
            return false;
          }

          const p2: Point = { x: ev.clientX, y: ev.clientY };
          setRange((range) => (range ? { ...range, p2 } : undefined));
        },
      }),
      bind(el, {
        type: 'pointerup',
        listener: (ev) => {
          if (ev.target !== el) {
            return false;
          }

          setRange((range) => {
            if (range?.p1 && range?.p2) {
              const bounds = getRect(range.p1, range.p2);
              cb?.(bounds, ev.shiftKey);
            } else {
              cb?.(null);
            }

            return undefined;
          });
        },
      }),
    );
  }, [el, cb]);

  return range?.p1 && range?.p2 ? getRect(range.p1, range.p2) : null;
};
