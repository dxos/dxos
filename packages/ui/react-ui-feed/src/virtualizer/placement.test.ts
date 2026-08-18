//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Placement } from './placement';

/**
 * The placement module, with nothing rendered.
 *
 * These are the properties the DOM shape depends on, checked where they can be checked exactly:
 * against arithmetic rather than against a browser. `placement/*` then checks that the DOM binding
 * honours them, and `baseline/*` that a real item does not break them — three layers, each able to
 * fail on its own, which is what says where a defect is (§1).
 *
 * Nothing here names an axis. If a test reads `top` or `height`, the axis has leaked in (§9).
 */

const VIEWPORT = 800;

type Options = {
  count?: number;
  extent?: (index: number) => number;
  exact?: boolean;
  overscan?: number;
};

/**
 * A model whose ids can be shifted, because that is what a prepend does.
 *
 * `getId` is read live rather than captured: the module's contract is that it reflects the model as
 * it now stands, so a fixture that maps index to id statically cannot express a prepend at all — it
 * describes a list where inserting at the front renames every row instead of moving it.
 */
const create = ({ count = 500, extent = () => 100, exact, overscan = 2 }: Options = {}) => {
  const ids = Array.from({ length: count }, (_, index) => `row-${index}`);
  const placement = new Placement({
    count,
    getId: (index) => ids[index],
    extents: { of: extent, exact },
    viewport: VIEWPORT,
    overscan,
  });

  return {
    placement,
    /** Inserts `n` rows before everything, as a rewind or a page of history would. */
    prepend: (n: number) => {
      ids.unshift(...Array.from({ length: n }, (_, index) => `earlier-${index}`));
      placement.setCount(ids.length, { prepended: n });
    },
    append: (n: number) => {
      ids.push(...Array.from({ length: n }, (_, index) => `later-${index}`));
      placement.setCount(ids.length);
    },
  };
};

describe('placement', () => {
  test('positions are exact when the host says the extents are', () => {
    const { placement } = create({ exact: true, extent: () => 100 });

    expect(placement.positionOf(0)).to.eq(0);
    expect(placement.positionOf(7)).to.eq(700);
    // Measuring is a no-op under `exact`: the host promised, so there is nothing to revise (§8).
    placement.measure('row-3', 999);
    expect(placement.positionOf(7)).to.eq(700);
  });

  test('the window covers the viewport, and no more than overscan beyond it', () => {
    const { placement } = create({ extent: () => 100, overscan: 2 });
    placement.scrollTo(1_000);

    const { first, last, visible } = placement.layout();
    expect(first).to.eq(8);
    expect(last).to.eq(19);
    // What the reader can see, as against what is mounted: a readout that named a mounted row would
    // be describing the overscan.
    expect(visible).to.deep.eq({ first: 10, last: 17 });
  });

  test('the sizer spans the whole model', () => {
    const { placement } = create({ count: 10, extent: () => 100, exact: true });

    expect(placement.layout().sizerExtent).to.eq(1_000);
  });

  //
  // The properties the design turns on.
  //

  test('measuring a row after the anchor does not move the anchor', () => {
    const { placement } = create();
    placement.scrollTo(2_000);
    const anchor = placement.anchor;
    const before = placement.positionOf(anchor.index);

    placement.measure(`row-${anchor.index + 3}`, 400);

    expect(placement.positionOf(anchor.index)).to.eq(before);
  });

  test('measuring a row before the anchor moves that row, and still not the anchor', () => {
    const { placement } = create();
    placement.scrollTo(2_000);
    const anchor = placement.anchor;
    const earlier = anchor.index - 1;
    const anchorBefore = placement.positionOf(anchor.index);
    const earlierBefore = placement.positionOf(earlier);

    placement.measure(`row-${earlier}`, 300);

    // The anchor is what is being held; the row that grew is what moved.
    expect(placement.positionOf(anchor.index)).to.eq(anchorBefore);
    expect(placement.positionOf(earlier)).to.eq(earlierBefore - 200);
  });

  test('prepending moves nothing at or after the anchor', () => {
    const { placement, prepend } = create({ count: 100 });
    placement.scrollTo(2_000);
    const anchor = placement.anchor;
    const positions = [0, 1, 2, 3].map((step) => placement.positionOf(anchor.index + step));

    // Ten rows arrive before the reader: the model is longer and every index has shifted.
    prepend(10);

    expect(placement.anchor.index).to.eq(anchor.index + 10);
    expect([0, 1, 2, 3].map((step) => placement.positionOf(placement.anchor.index + step))).to.deep.eq(positions);
  });

  test('appending moves nothing at all', () => {
    const { placement, append } = create({ count: 100 });
    placement.scrollTo(2_000);
    const before = placement.layout();

    append(10);

    const after = placement.layout();
    expect(after.offset).to.eq(before.offset);
    expect(after.first).to.eq(before.first);
    // Only the region the thumb describes grew.
    expect(after.sizerExtent).to.be.greaterThan(before.sizerExtent);
  });

  test('re-anchoring preserves every position', () => {
    const { placement } = create({ count: 500 });
    const sampled = () => [10, 40, 80].map((index) => placement.positionOf(index));

    placement.scrollTo(1_000);
    const before = sampled();
    // Far enough that the anchor cannot still be in the window.
    placement.scrollTo(6_000);
    placement.scrollTo(1_000);

    expect(sampled()).to.deep.eq(before);
  });

  test('extents are keyed by identity, so a prepend cannot lose them', () => {
    const { placement, prepend } = create({ count: 100 });
    placement.measure('row-50', 250);
    const before = placement.extentOf(50);

    prepend(5);

    // `row-50` is now at index 55; the extent followed the id rather than the position.
    expect(before).to.eq(250);
    expect(placement.extentOf(55)).to.eq(250);
  });

  //
  // The edges, where estimate meets ground truth.
  //

  test('no drift is reported when the estimates were right', () => {
    const { placement } = create({ count: 20, extent: () => 100, exact: true });
    placement.jumpTo(0);

    expect(placement.drift()).to.be.undefined;
  });

  test('reaching the start reports how wrong the estimate above was', () => {
    const { placement } = create({ count: 200, extent: () => 100 });
    // Jumped from estimates, then the rows turn out to be half what was assumed.
    placement.jumpTo(50);
    for (let index = 0; index < 60; index++) {
      placement.measure(`row-${index}`, 50);
    }

    placement.scrollTo(0);

    const drift = placement.drift();
    expect(drift?.edge).to.eq('start');
    // Fifty rows assumed at 100 and measured at 50: the region above was 2,500 shorter than assumed.
    expect(drift?.delta).to.eq(2_500);
  });

  //
  // Following the end, which is where a chat lives.
  //

  test('the end is where the last row rests against the end of the viewport', () => {
    const { placement } = create({ count: 20, extent: () => 100, exact: true });

    // Twenty rows of 100 is 2,000 of content, and the last of them rests when the final 800 is on
    // screen — not when the document's end is, which is a different number as soon as anything is
    // reserved past it.
    expect(placement.endOffset()).to.eq(1_200);
  });

  test('reserved space is somewhere the reader may go, not where the end is', () => {
    const { placement } = create({ count: 20, extent: () => 100, exact: true });
    placement.setReserve(700);

    expect(placement.endOffset()).to.eq(1_200);
    expect(placement.layout().sizerExtent).to.eq(2_700);
  });

  test('following the end settles once the rows it reveals have been measured', () => {
    const { placement } = create({ count: 200, extent: () => 100 });
    const offsets: number[] = [];

    // What a sticky feed does on every commit: go to the end, measure whatever that mounted, ask
    // again. The rows are half again as tall as assumed, so the first answer cannot be right.
    for (let round = 0; round < 6; round++) {
      placement.scrollTo(placement.endOffset());
      const { first, last } = placement.layout();
      for (let index = first; index <= last; index++) {
        placement.measure(`row-${index}`, 150);
      }

      offsets.push(placement.endOffset());
    }

    // Settled, and settled *quickly*: a round here is a React commit, and fifty of them is the
    // update limit — which is the wall `bridge/Tail` was hitting rather than converging.
    expect(offsets.at(-1)).to.eq(offsets.at(-2));
    expect(offsets.indexOf(offsets.at(-1)!)).to.be.lessThan(3);
  });

  test('following the end is not disturbed by rows the reader has already passed', () => {
    const { placement } = create({ count: 200, extent: () => 100 });
    placement.scrollTo(placement.endOffset());
    const { first } = placement.layout();
    const before = { end: placement.endOffset(), first: placement.positionOf(first) };

    // A row far above the window turns out to be twice its estimate, as history is measured on the
    // way through. Summing the model from index 0 to find the end would carry that 100 into the
    // tail's position and move what the reader is looking at, for a row they cannot see.
    placement.measure('row-3', 200);

    expect({ end: placement.endOffset(), first: placement.positionOf(first) }).to.deep.eq(before);
  });

  test('replacing the model keeps measurement and its lookup on the same row', () => {
    const ids = ['a', 'b', 'c'];
    const placement = new Placement({
      count: 3,
      getId: (index) => ids[index],
      extents: { of: () => 100 },
      viewport: VIEWPORT,
    });

    // The host appends, which in React means a *new* closure over a *new* list — the same shape as
    // `messages.map` giving a fresh `getId` on every render.
    const grown = ['a', 'b', 'c', 'd'];
    placement.setGetId((index) => grown[index]);
    placement.setCount(4);
    placement.measure('d', 250);

    // Stored against the id the binding read off the row, and read back for the same row. Held to
    // the stale closure, index 3 resolves to `undefined` and the measurement is never found again —
    // the binding re-measures it every commit, which is a render loop, not a size error.
    expect(placement.extentOf(3)).to.eq(250);
  });

  test('rebasing the start puts row 0 at zero and moves the view not at all', () => {
    const { placement } = create({ count: 200, extent: () => 100 });
    // Opened at the tail, then the rows above measure half again taller than assumed: row 0 is
    // pushed negative, where no scroll can reach it.
    placement.jumpTo(199, 'end');
    const { first, last } = placement.layout();
    for (let index = first; index <= last; index++) {
      placement.measure(`row-${index}`, 150);
    }

    const anchorBefore = placement.anchor.index;
    const onScreen = placement.positionOf(anchorBefore) - placement.scroll;

    const shift = placement.rebaseStart();

    expect(placement.positionOf(0)).to.eq(0);
    // What the reader sees is a row's position relative to the scroll, and it has not moved.
    expect(placement.positionOf(anchorBefore) - placement.scroll).to.eq(onScreen);
    expect(shift).to.not.eq(0);
    // Repaying twice is a no-op: the fact is now true.
    expect(placement.rebaseStart()).to.eq(0);
  });

  test('an empty model has no window and no drift', () => {
    const { placement } = create({ count: 0 });

    expect(placement.layout()).to.deep.eq({
      first: 0,
      last: -1,
      visible: { first: 0, last: -1 },
      offset: 0,
      sizerExtent: 0,
    });
    expect(placement.drift()).to.be.undefined;
  });
});
