//
// Copyright 2024 DXOS.org
//

import { bindAll } from 'bind-event-listener';
import { useEffect, useRef, useState } from 'react';

import { type Rect, getRelativePoint } from '@dxos/react-ui-canvas';

import { type Range, getBounds } from '../layout';

export type SelectionEvent = {
  bounds?: Rect | null;
  subtract?: boolean;
};

/**
 * Event listener to track range bounds selection.
 */
// TODO(burdon): Reconcile with useDrag.
export const useSelectionEvents = (root: HTMLElement | null, cb?: (event: SelectionEvent) => void): Rect | null => {
  const [bounds, setBounds] = useState<Rect | null>(null);

  const shiftRef = useRef(false);
  const rangeRef = useRef<Partial<Range> | null>(null);

  useEffect(() => {
    if (!root) {
      return;
    }

    return bindAll(root, [
      {
        type: 'keydown',
        listener: (ev) => {
          if (ev.key === 'Escape') {
            rangeRef.current = null;
            setBounds(null);
            console.log('@@@');
          }
        },
      },
      {
        type: 'pointerdown',
        listener: (ev) => {
          if (ev.target !== root) {
            return;
          }

          shiftRef.current = ev.shiftKey;
          rangeRef.current = { p1: getRelativePoint(root, ev) };
        },
      },
      {
        type: 'pointermove',
        listener: (ev) => {
          if (!rangeRef.current?.p1) {
            return;
          }

          rangeRef.current.p2 = getRelativePoint(root, ev);
          if (shiftRef.current) {
            setBounds(getBounds(rangeRef.current.p1, rangeRef.current.p2));
          }
        },
      },
      {
        type: 'pointerup',
        listener: (ev) => {
          if (rangeRef.current?.p1) {
            if (rangeRef.current?.p2) {
              if (shiftRef.current) {
                const bounds = getBounds(rangeRef.current.p1, rangeRef.current.p2);
                cb?.({ bounds, subtract: ev.altKey });
              }
            } else {
              cb?.({ bounds: null });
            }
          }

          shiftRef.current = false;
          rangeRef.current = null;
          setBounds(null);
        },
      },
    ]);
  }, [root, cb]);

  return bounds;
};
