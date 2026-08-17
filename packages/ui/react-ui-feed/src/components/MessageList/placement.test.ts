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

    const { first, last } = placement.layout();
    expect(first).to.eq(8);
    expect(last).to.eq(19);
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

  test('an empty model has no window and no drift', () => {
    const { placement } = create({ count: 0 });

    expect(placement.layout()).to.deep.eq({ first: 0, last: -1, offset: 0, sizerExtent: 0 });
    expect(placement.drift()).to.be.undefined;
  });
});
