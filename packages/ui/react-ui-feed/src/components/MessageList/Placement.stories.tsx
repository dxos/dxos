//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { type EdgeDrift } from './placement';
import { Window, type WindowAxis } from './Window';

/**
 * The DOM shape, driven by content that cannot lie about its size.
 *
 * Between `placement.test.ts` (arithmetic, no DOM) and `baseline/*` (a real feed, real editors) sits
 * this: plain boxes of declared extent, so anything that moves here is the shape and not the item.
 * The layer exists because the two things fail differently and a single suite cannot say which.
 */
type StoryProps = {
  count?: number;
  axis?: WindowAxis;
  exact?: boolean;
  /** Extent the row actually renders at — the story controls it, so the story knows the truth. */
  extent?: (index: number) => number;
  /**
   * Extent the host *claims*, when that differs from what renders.
   *
   * Two callbacks, not one, because a story that reports the same number it renders cannot express a
   * host being wrong — which is the only thing `Drift` is about.
   */
  declared?: (index: number) => number;
};

const EXTENT = (index: number) => 40 + (index % 5) * 30;

const Harness = ({ count = 500, axis = 'block', exact = true, extent = EXTENT, declared }: StoryProps) => {
  const [edges, setEdges] = useState<EdgeDrift[]>([]);
  const [mismatches, setMismatches] = useState<string[]>([]);
  const onEdge = useCallback((drift: EdgeDrift) => setEdges((all) => [...all.slice(-4), drift]), []);
  const onMismatch = useCallback(
    (mismatch: { index: number; declared: number; actual: number }) =>
      setMismatches((all) => [...all.slice(-4), `${mismatch.index}: ${mismatch.declared}→${mismatch.actual}`]),
    [],
  );

  return (
    <div className='flex flex-col h-full'>
      <div className='p-2 text-xs text-description tabular-nums' data-testid='placement.report'>
        {`edges ${edges.map(({ edge, delta }) => `${edge}${delta}`).join(' ') || '—'} · mismatch ${mismatches.join(' ') || '—'}`}
      </div>
      <Window
        classNames='grow min-h-0'
        count={count}
        getId={(index) => `row-${index}`}
        extents={{ of: declared ?? extent, exact }}
        axis={axis}
        onEdge={onEdge}
        onMismatch={onMismatch}
      >
        {(index) => (
          <div
            className={mx(
              'flex items-center justify-center border border-separator text-xs tabular-nums',
              index % 2 ? 'bg-input-surface' : 'bg-base-surface',
            )}
            style={axis === 'block' ? { height: extent(index) } : { width: extent(index) }}
          >
            {index}
          </div>
        )}
      </Window>
    </div>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-feed/placement',
  render: Harness,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem] h-[30rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { count: 500 },
};

export default meta;

type Story = StoryObj<StoryProps>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async (frames = 20) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

type Probe = {
  scroller: HTMLElement;
  window: HTMLElement;
  sizer: HTMLElement;
  offset: number;
  rows: Map<number, number>;
};

/** Everything a story asserts on, read in one frame so nothing is compared across a change. */
const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe => {
  const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
  const win = canvasElement.querySelector<HTMLElement>('[data-testid="window.window"]')!;
  const sizer = canvasElement.querySelector<HTMLElement>('[data-testid="window.sizer"]')!;
  const origin = scroller.getBoundingClientRect();
  const rows = new Map(
    [...win.children].map((child) => {
      const row = child as HTMLElement;
      const box = row.getBoundingClientRect();
      return [Number(row.dataset.index), Math.round(axis === 'block' ? box.top - origin.top : box.left - origin.left)];
    }),
  );

  const matched = /translate[XY]\(([-\d.]+)px\)/.exec(win.style.transform);
  return { scroller, window: win, sizer, offset: Math.round(Number(matched?.[1] ?? 0)), rows };
};

/** Rows present in both readings that are not where they were. */
const moved = (before: Probe, after: Probe): number[] =>
  [...after.rows]
    .filter(([index, at]) => before.rows.has(index) && Math.abs(before.rows.get(index)! - at) > 1)
    .map(([index]) => index);

//
// The properties, one story each.
//

/**
 * The window is placed where the arithmetic says, and the edges agree with the model.
 *
 * `offset === 0` at the start and `offset + window === sizer` at the end are where estimate meets
 * ground truth — with `exact` extents they must hold to the pixel, which is what makes this the
 * control the other stories are read against.
 */
export const Static: Story = {
  play: async ({ canvasElement }) => {
    await settle();
    const top = probe(canvasElement);
    await expect(top.offset).toEqual(0);

    top.scroller.scrollTop = top.scroller.scrollHeight;
    await settle();

    const bottom = probe(canvasElement);
    const windowExtent = bottom.window.getBoundingClientRect().height;
    await expect({
      startsAtZero: top.offset === 0,
      endsAtTheEnd: Math.abs(bottom.offset + Math.round(windowExtent) - bottom.sizer.offsetHeight) <= 1,
    }).toEqual({ startsAtZero: true, endsAtTheEnd: true });
  },
};

/** Rows arriving at the end move nothing that is already on screen, and do not move the window. */
export const Append: Story = {
  render: (args) => {
    const [count, setCount] = useState(200);
    useEffect(() => {
      (window as any).__append = () => setCount((value) => value + 20);
    }, []);
    return <Harness {...args} count={count} />;
  },
  play: async ({ canvasElement }) => {
    await settle();
    const before = probe(canvasElement);

    (window as any).__append();
    await settle();

    const after = probe(canvasElement);
    await expect({ moved: moved(before, after), offset: after.offset === before.offset }).toEqual({
      moved: [],
      offset: true,
    });
  },
};

/**
 * The hard case: rows inserted *before* the reader.
 *
 * Everything at or after the anchor has to stay exactly where it is, in the frame the insert lands —
 * which is the whole reason placement is anchor-relative rather than summed from index 0.
 */
export const Prepend: Story = {
  render: (args) => {
    const [before, setBefore] = useState(0);
    useEffect(() => {
      (window as any).__prepend = () => setBefore((value) => value + 20);
    }, []);
    return <Harness {...args} count={200 + before} extent={(index) => EXTENT(index - before)} />;
  },
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    scroller.scrollTop = 3_000;
    await settle();
    const before = probe(canvasElement);

    (window as any).__prepend();
    await settle();

    // Compared by the row's own identity, shifted by the insert: index 40 became index 60.
    const after = probe(canvasElement);
    const shifted = [...after.rows].filter(([index]) => before.rows.has(index - 20));
    const jumped = shifted.filter(([index, at]) => Math.abs(before.rows.get(index - 20)! - at) > 1);
    await expect({ compared: shifted.length > 0, jumped: jumped.map(([index]) => index) }).toEqual({
      compared: true,
      jumped: [],
    });
  },
};

/**
 * A row changing extent moves the rows after it and none before it — and costs us nothing.
 *
 * This is §6 in one assertion: the browser reflows the siblings. With rows placed by transform it
 * was 177 re-placements written by us for one disclosure.
 */
export const Grow: Story = {
  render: (args) => {
    const [grown, setGrown] = useState(false);
    useEffect(() => {
      (window as any).__grow = () => setGrown(true);
    }, []);
    return (
      <Harness {...args} count={200} exact={false} extent={(index) => (grown && index === 30 ? 400 : EXTENT(index))} />
    );
  },
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    scroller.scrollTop = 2_000;
    await settle();
    const before = probe(canvasElement);

    (window as any).__grow();
    await settle();

    const after = probe(canvasElement);
    const displaced = moved(before, after);
    await expect({
      before: displaced.filter((index) => index < 30),
      after: displaced.some((index) => index > 30),
    }).toEqual({ before: [], after: true });
  },
};

/** A jump lands, and both edge invariants still hold once it has. */
export const Jump: Story = {
  play: async ({ canvasElement }) => {
    await settle();
    const { scroller } = probe(canvasElement);
    scroller.scrollTop = scroller.scrollHeight / 2;
    await settle();

    const middle = probe(canvasElement);
    scroller.scrollTop = 0;
    await settle();

    const top = probe(canvasElement);
    await expect({ arrived: middle.rows.size > 0, backAtZero: top.offset }).toEqual({ arrived: true, backAtZero: 0 });
  },
};

/** The same shape on the other axis, where the layout constrains the extent and nothing is measured. */
export const Horizontal: Story = {
  args: { axis: 'inline', count: 200 },
  play: async ({ canvasElement }) => {
    await settle();
    const start = probe(canvasElement, 'inline');
    await expect(start.offset).toEqual(0);

    start.scroller.scrollLeft = 2_000;
    await settle();

    const scrolled = probe(canvasElement, 'inline');
    await expect({ moved: scrolled.rows.size > 0, offset: scrolled.offset > 0 }).toEqual({ moved: true, offset: true });
  },
};

/**
 * A declared extent that is wrong is **reported**, not silently absorbed.
 *
 * `exact` is a promise the host makes, and a promise nobody checks is how a 1px separator costs a day
 * of bisection (§8). The row renders at a size the callback did not claim; the mismatch names it.
 */
export const Drift: Story = {
  args: { count: 100 },
  // Rows render at their real extent; the callback under-reports by 20px on every third row.
  render: (args) => (
    <Harness
      {...args}
      exact
      extent={EXTENT}
      declared={(index) => (index % 3 === 0 ? EXTENT(index) - 20 : EXTENT(index))}
    />
  ),
  play: async ({ canvasElement }) => {
    await settle();

    const report = canvasElement.querySelector('[data-testid="placement.report"]')!.textContent ?? '';
    await expect({ reported: /mismatch \d+:/.test(report) }).toEqual({ reported: true });
  },
};
