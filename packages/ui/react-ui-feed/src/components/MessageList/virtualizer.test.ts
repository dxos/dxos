//
// Copyright 2026 DXOS.org
//

import { Virtualizer } from '@tanstack/virtual-core';
import { describe, expect, test } from 'vitest';

/**
 * The virtualizer's layout, driven headlessly.
 *
 * The flicker this list has been chased through all day is visual, and every instrument for it needs
 * a compositing browser — which makes it unassertable, and unassertable defects come back. These
 * tests state the property directly instead: **a row the reader is looking at must not change its
 * position on screen because some other row was measured.** Measuring a row is what a virtualizer
 * does constantly, so this is the whole contract.
 *
 * No React and no DOM: rows are "mounted" by reporting their real height, exactly as a
 * `ResizeObserver` would, and the scroll element is a pair of numbers.
 */

const VIEWPORT = 800;

/** Uneven on purpose: a feed of one-line prompts and long answers is what breaks a single estimate. */
const realHeight = (index: number) => (index % 2 === 0 ? 57 : 400);

type Harness = {
  virtualizer: Virtualizer<any, any>;
  /** Move the scroll, as the browser would. */
  scrollTo: (offset: number) => void;
  /** Report the real height of every mounted row that has not been measured yet. */
  measureMounted: () => void;
  /** Where a row sits on screen: what the reader sees, and what must not change. */
  screenPosition: (index: number) => number | undefined;
  scrollOffset: () => number;
};

const createHarness = ({ count = 200, estimate = 120 }: { count?: number; estimate?: number } = {}): Harness => {
  let offset = 0;
  const measured = new Set<number>();
  let notifyOffset: ((offset: number, isScrolling: boolean) => void) | undefined;

  // The virtualizer reaches for `element.ownerDocument.defaultView` to find its window, and through
  // it the document element, when it adjusts the scroll itself.
  const scrollElement = {
    ownerDocument: { defaultView: { document: { documentElement: { style: {} } } } },
  };

  const virtualizer = new Virtualizer<any, any>({
    count,
    estimateSize: () => estimate,
    getScrollElement: () => scrollElement as any,
    getItemKey: (index) => `message-${index}`,
    overscan: 4,
    observeElementRect: (_instance, cb) => {
      cb({ width: 600, height: VIEWPORT });
      return undefined;
    },
    observeElementOffset: (_instance, cb) => {
      notifyOffset = cb;
      cb(offset, false);
      return undefined;
    },
    scrollToFn: (target) => {
      offset = target;
      notifyOffset?.(offset, false);
    },
    onChange: () => {},
  });

  virtualizer._willUpdate();

  return {
    virtualizer,
    scrollTo: (next) => {
      offset = next;
      notifyOffset?.(offset, true);
      virtualizer._willUpdate();
    },
    measureMounted: () => {
      for (const item of virtualizer.getVirtualItems()) {
        if (!measured.has(item.index)) {
          measured.add(item.index);
          virtualizer.resizeItem(item.index, realHeight(item.index));
        }
      }
      virtualizer._willUpdate();
    },
    screenPosition: (index) => {
      const item = virtualizer.getVirtualItems().find((candidate) => candidate.index === index);
      return item && item.start - virtualizer.scrollOffset!;
    },
    scrollOffset: () => virtualizer.scrollOffset ?? 0,
  };
};

describe('virtualizer layout', () => {
  test('a measured row does not move the rows already on screen', () => {
    const harness = createHarness();

    // Somewhere in the middle, with the rows around it already measured.
    harness.scrollTo(5_000);
    harness.measureMounted();

    const anchor = harness.virtualizer.getVirtualItems()[6];
    const before = harness.screenPosition(anchor.index);

    // A row further down is measured — the reader is not looking at it.
    harness.virtualizer.resizeItem(anchor.index + 3, realHeight(anchor.index + 3) + 120);
    harness.virtualizer._willUpdate();

    expect(harness.screenPosition(anchor.index)).toBeCloseTo(before!, 0);
  });

  test('measuring a row ABOVE the reader does not move what they are looking at', () => {
    const harness = createHarness();
    harness.scrollTo(5_000);
    harness.measureMounted();

    const items = harness.virtualizer.getVirtualItems();
    const anchor = items.find((item) => item.start >= harness.scrollOffset())!;
    const before = harness.screenPosition(anchor.index);

    // The case that produces the visible jump: a row above the viewport turns out to be taller than
    // its estimate, which moves every offset below it — including the anchor's.
    const above = items[0].index;
    harness.virtualizer.resizeItem(above, realHeight(above) + 200);
    harness.virtualizer._willUpdate();

    expect(harness.screenPosition(anchor.index)).toBeCloseTo(before!, 0);
  });

  test('scrolling up settles at the tail without the content moving under the reader', () => {
    const harness = createHarness({ count: 200, estimate: 120 });

    // Open at the tail, as a chat does.
    harness.virtualizer.scrollToIndex(199, { align: 'end' });
    harness.measureMounted();

    const items = harness.virtualizer.getVirtualItems();
    const anchor = items.find((item) => item.start >= harness.scrollOffset())!;
    const before = harness.screenPosition(anchor.index);

    // Travel upward in steps, measuring whatever enters — the gesture from the recording.
    for (let step = 0; step < 10; step++) {
      harness.scrollTo(Math.max(0, harness.scrollOffset() - 300));
      harness.measureMounted();
      const position = harness.screenPosition(anchor.index);
      if (position !== undefined) {
        // The anchor travels with the scroll: 300px per step, no more and no less.
        expect(position).toBeCloseTo(before! + 300 * (step + 1), 0);
      }
    }
  });
});
