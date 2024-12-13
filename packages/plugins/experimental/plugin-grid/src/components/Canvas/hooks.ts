//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { bind } from 'bind-event-listener';
import { useEffect, useState } from 'react';

import { type Rect, getRect, type Point, type Range } from '../../layout';

/**
 * Event listener to track range bounds selection.
 */
export const useBoundingSelection = (svg: SVGSVGElement | null, cb?: (bounds: Rect | null) => void): Rect | null => {
  const [range, setRange] = useState<Partial<Range>>();
  useEffect(() => {
    if (!svg) {
      return;
    }

    return combine(
      bind(svg, {
        type: 'pointerdown',
        listener: (event) => {
          const p1: Point = { x: event.clientX, y: event.clientY };
          setRange({ p1 });
        },
      }),
      bind(svg, {
        type: 'pointermove',
        listener: (event) => {
          const p2: Point = { x: event.clientX, y: event.clientY };
          setRange((range) => (range ? { ...range, p2 } : undefined));
        },
      }),
      bind(svg, {
        type: 'pointerup',
        listener: (event) => {
          setRange((range) => {
            if (range?.p1 && range?.p2) {
              const bounds = getRect(range.p1, range.p2);
              cb?.(bounds);
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
