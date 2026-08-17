//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type EdgeDrift, type Extents, Placement } from './placement';

/**
 * The DOM shape, and nothing else.
 *
 * Three elements: a **sizer** that holds no rows and exists only to give the thumb something to
 * measure, a **window** holding the mounted rows in normal flow, and the scroller around them. The
 * window is absolutely positioned and moved by a transform, so a correction changes one number and
 * never touches `scrollTop` — which is what stops corrections and the reader sharing a channel (§7).
 *
 * Rows are unpositioned. A row that changes extent reflows the ones after it, in the browser, in the
 * same frame; the alternative was re-placing every row below it ourselves on every frame of the
 * change — measured at 177 re-placements for one disclosure opening (§6).
 *
 * Knows nothing about messages, markdown or CodeMirror. What it renders is whatever `children`
 * returns, which is what lets `placement/*` drive it with content that cannot lie about its size.
 */
export type WindowAxis = 'block' | 'inline';

export type WindowProps = ThemedClassName<{
  count: number;
  getId: (index: number) => string;
  extents: Extents;
  /** Which way the list runs. The principles hold either way; only this mapping differs (§9). */
  axis?: WindowAxis;
  overscan?: number;
  /** What an edge revealed about the estimates, if it revealed anything. */
  onEdge?: (drift: EdgeDrift) => void;
  /** A row whose declared extent was not the extent it rendered at. `exact` means do not correct — not do not check (§8). */
  onMismatch?: (mismatch: { index: number; id: string; declared: number; actual: number }) => void;
  children: (index: number, id: string) => ReactNode;
}>;

export const Window = ({
  classNames,
  count,
  getId,
  extents,
  axis = 'block',
  overscan,
  onEdge,
  onMismatch,
  children,
}: WindowProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [, render] = useState(0);
  const invalidate = useCallback(() => render((value) => value + 1), []);

  // Held across renders, and told about the model rather than rebuilt from it: the anchor is state,
  // and rebuilding would discard the one position that is known exactly.
  const placement = useMemo(
    () => new Placement({ count, getId, extents, viewport: 0, overscan }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // A mismatch is news the first time and noise afterwards. Without this the report is emitted on
  // every commit, and a host that renders the report re-renders on it — which is an infinite loop,
  // found by `placement/Drift` on its first run.
  const reported = useRef(new Set<string>());

  const previousCount = useRef(count);
  if (previousCount.current !== count) {
    // Rows arriving before the reader shift every index; the anchor's *position* is untouched, which
    // is why a prepend moves nothing at or after it.
    const prepended = Math.max(0, count - previousCount.current);
    placement.setCount(count, { prepended: getId(0) !== placement.anchor.id && prepended ? prepended : 0 });
    previousCount.current = count;
  }

  const main = axis === 'block' ? 'height' : 'width';

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const read = () => (axis === 'block' ? scroller.clientHeight : scroller.clientWidth);
    placement.setViewport(read());
    const observer = new ResizeObserver(() => {
      placement.setViewport(read());
      invalidate();
    });

    observer.observe(scroller);
    const onScroll = () => {
      placement.scrollTo(axis === 'block' ? scroller.scrollTop : scroller.scrollLeft);
      invalidate();
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    invalidate();
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [placement, axis, invalidate]);

  // Measured after every commit, so a row that grows later — a font, a portaled widget, an image —
  // is not a special case but the same case arriving again (§8).
  useLayoutEffect(() => {
    const parent = windowRef.current;
    if (!parent) {
      return;
    }

    let changed = false;
    for (const element of parent.children) {
      const row = element as HTMLElement;
      const index = Number(row.dataset.index);
      const id = row.dataset.objectId!;
      const actual = Math.round(axis === 'block' ? row.offsetHeight : row.offsetWidth);
      const declared = placement.extentOf(index);
      if (extents.exact) {
        const key = `${id}:${declared}:${actual}`;
        if (actual !== declared && !reported.current.has(key)) {
          reported.current.add(key);
          onMismatch?.({ index, id, declared, actual });
        }
        continue;
      }

      if (actual && actual !== declared) {
        placement.measure(id, actual);
        changed = true;
      }
    }

    const drift = placement.drift();
    if (drift) {
      onEdge?.(drift);
    }

    if (changed) {
      invalidate();
    }
  });

  const { first, last, offset, sizerExtent } = placement.layout();
  const rows = [];
  for (let index = first; index <= last; index++) {
    rows.push(
      <div key={getId(index)} data-index={index} data-object-id={getId(index)}>
        {children(index, getId(index))}
      </div>,
    );
  }

  return (
    <div
      ref={scrollerRef}
      className={mx('relative', axis === 'block' ? 'overflow-y-auto' : 'overflow-x-auto', classNames)}
      // Off deliberately: the browser adjusting the scroll as well would be a second party anchoring
      // the same thing, and the defect this design exists to remove is exactly that (§6).
      style={{ overflowAnchor: 'none' }}
      data-testid='window.scroller'
    >
      <div style={{ [main]: sizerExtent }} data-testid='window.sizer' />
      <div
        ref={windowRef}
        className={mx('absolute top-0 left-0 flex', axis === 'block' ? 'flex-col w-full' : 'flex-row h-full')}
        style={{ transform: axis === 'block' ? `translateY(${offset}px)` : `translateX(${offset}px)` }}
        data-testid='window.window'
      >
        {rows}
      </div>
    </div>
  );
};
