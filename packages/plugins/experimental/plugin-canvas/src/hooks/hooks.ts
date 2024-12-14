//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { bind } from 'bind-event-listener';
import { useEffect, useState } from 'react';

import { getRect, type Rect, type Point, type Range } from '../layout';

export type SelectionBoundsCallback = (bounds: Rect | null, shift?: boolean) => void;

/**
 * Event listener to track range bounds selection.
 */
export const useBoundingSelection = (svg: SVGSVGElement | null, cb?: SelectionBoundsCallback): Rect | null => {
  const [range, setRange] = useState<Partial<Range>>();
  useEffect(() => {
    if (!svg) {
      return;
    }

    return combine(
      bind(svg, {
        type: 'pointerdown',
        listener: (ev) => {
          const p1: Point = { x: ev.clientX, y: ev.clientY };
          setRange({ p1 });
        },
      }),
      bind(svg, {
        type: 'pointermove',
        listener: (ev) => {
          const p2: Point = { x: ev.clientX, y: ev.clientY };
          setRange((range) => (range ? { ...range, p2 } : undefined));
        },
      }),
      bind(svg, {
        type: 'pointerup',
        listener: (ev) => {
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
  }, [svg, cb]);

  return range?.p1 && range?.p2 ? getRect(range.p1, range.p2) : null;
};
