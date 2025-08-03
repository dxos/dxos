//
// Copyright 2024 DXOS.org
//

import { bindAll } from 'bind-event-listener';
import { useEffect, useState } from 'react';

import { type Rect, getRelativePoint } from '@dxos/react-ui-canvas';

import { type Range, getBounds } from '../layout';

export type SelectionEvent = { bounds?: Rect | null; shift?: boolean };

/**
 * Event listener to track range bounds selection.
 */
export const useSelectionEvents = (el: HTMLElement | null, cb?: (event: SelectionEvent) => void): Rect | null => {
  const [range, setRange] = useState<Partial<Range>>();
  useEffect(() => {
    if (!el) {
      return;
    }

    return bindAll(el, [
      {
        type: 'keydown',
        listener: (ev) => {
          if (ev.key === 'Escape') {
            setRange(undefined);
          }
        },
      },
      {
        type: 'pointerdown',
        listener: (ev) => {
          if (ev.target !== el) {
            return;
          }

          const p1 = getRelativePoint(el, ev);
          setRange({ p1 });
        },
      },
      {
        type: 'pointermove',
        listener: (ev) => {
          if (!range) {
            return;
          }

          const p2 = getRelativePoint(el, ev);
          setRange((range) => (range ? { ...range, p2 } : undefined));
        },
      },
      {
        type: 'pointerup',
        listener: (ev) => {
          if (range?.p1 && !range?.p2) {
            cb?.({ bounds: null });
          } else {
            cb?.({ bounds: range?.p1 && range?.p2 ? getBounds(range.p1, range.p2) : undefined, shift: ev.shiftKey });
          }

          setRange(undefined);
        },
      },
    ]);
  }, [el, cb]);

  return range?.p1 && range?.p2 ? getBounds(range.p1, range.p2) : null;
};
