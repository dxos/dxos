//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expect } from 'storybook/test';

import { IconButton, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { ListModel } from './list-model.ts';
import { type EdgeDrift } from './placement.ts';
import { Window, type WindowAxis, type WindowController, type WindowState } from './Window.tsx';

const EXTENT = (index: number) => 40 + (index % 8) * 30;

/** One harness row: identity plus the extent it renders at, so a prepend moves rows, not sizes. */
type Row = { id: string; extent: number };

/** The row `Grow` changes; near the top, so it is mounted whatever the extents turn out to be. */
const GROWN = 5;

/**
 * The DOM shape, driven by content that cannot lie about its size.
 *
 * Between `placement.test.ts` (arithmetic, no DOM) and `baseline/*` (a real feed, real editors) sits
 * this: plain boxes of declared extent, so anything that moves here is the shape and not the item.
 * The layer exists because the two things fail differently and a single suite cannot say which.
 */
type StoryArgs = {
  /** Rows the model is seeded with; the append/prepend buttons then drive the model directly. */
  count?: number;
  axis?: WindowAxis;
  exact?: boolean;
  /** Extent the row actually renders at — the story controls it, so the story knows the truth. */
  extent?: (index: number) => number;
  /** Outline every row and label its extent, so what is being measured is visible. */
  debug?: boolean;
  /**
   * Controls a story needs to drive the list, rendered in the toolbar when supplied.
   *
   * Buttons rather than a global the play function calls: a story is rendered more than once, so a
   * `window.__grow` captured in an effect goes stale and the press lands on a previous mount's
   * state — which presented as `Prepend` and `Grow` passing or failing depending on what else ran.
   * A button is the same thing the reader has, and there is only ever one of it.
   */
  /** Render the append button; 'few' appends 5 rows per press instead of 20 (the sticky story). */
  append?: boolean | 'few';
  /** Keep the last row against the bottom of the viewport as content arrives. */
  sticky?: boolean;
  prepend?: boolean;
  grow?: boolean;
  /**
   * Reserve a viewport's worth of space after the last row, so it can be read at the top.
   *
   * Computed **here**, from what the window publishes, and handed back as a number — which is the
   * claim §7 makes: with the window placed rather than the rows, this is not a mode the list has.
   */
  scrollPastEnd?: boolean;
  /**
   * Extent the host *claims*, when that differs from what renders.
   *
   * Two callbacks, not one, because a story that reports the same number it renders cannot express a
   * host being wrong — which is the only thing `Drift` is about.
   */
  declared?: (index: number) => number;
};

const DefaultStory = ({
  count = 500,
  axis = 'block',
  exact = true,
  extent = EXTENT,
  declared,
  debug,
  scrollPastEnd,
  append,
  prepend,
  grow,
  sticky,
}: StoryArgs) => {
  // The model the window binds to: the buttons drive it directly, so a prepend is *told* and the
  // stories exercise the told path rather than the replace-adapter's inference (SPEC F-7.1).
  // Items carry their extent — keyed by identity, so a prepend moves rows without resizing them.
  const model = useMemo(
    () =>
      new ListModel<Row>({
        items: Array.from({ length: count }, (_, index) => ({ id: `row-${index}`, extent: extent(index) })),
        getId: (item) => item.id,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // The harness re-renders on structural changes; the window subscribes on its own.
  const [, setVersion] = useState(0);
  useEffect(() => model.subscribe(() => setVersion((version) => version + 1)), [model]);
  const total = model.count;

  const [edges, setEdges] = useState<EdgeDrift[]>([]);
  const [mismatches, setMismatches] = useState<string[]>([]);
  const [state, setState] = useState<WindowState>();
  const controller = useRef<WindowController>(null);
  const onEdge = useCallback((drift: EdgeDrift) => setEdges((all) => [...all.slice(-4), drift]), []);
  const onMismatch = useCallback(
    (mismatch: { index: number; declared: number; actual: number }) =>
      setMismatches((all) => [...all.slice(-4), `${mismatch.index}: ${mismatch.declared}→${mismatch.actual}`]),
    [],
  );

  // Everything here is *outside* the window, reading what it publishes: chrome is the host's, and a
  // toolbar that reached inside would be the engine growing an opinion about navigation (§2).
  // Smooth, because a step is a move the reader should be able to follow with their eyes — and it
  // can be here: corrections move the window rather than the scroll (§7), so nothing cancels the
  // animation halfway. The old engine had to make this instant for exactly that reason.
  const step = (delta: number) => controller.current?.scrollToIndex((state?.index ?? 0) + delta, 'start', 'smooth');

  // Measured from the container this owns, not from what the window publishes.
  //
  // Deriving it from `state.geometry.viewport` looks equivalent and is not: the reserve changes the
  // sizer, the sizer changes the layout, the layout is what publishes the viewport — and the whole
  // thing oscillates. React said `Maximum update depth exceeded`, which is the same "two things
  // compensating for one change" this design exists to remove, wearing a new hat. A reserve is an
  // input to the layout; anything read back out of the layout cannot be one.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const element = bodyRef.current;
    if (!element) {
      return;
    }

    const read = () => setAvailable(axis === 'block' ? element.clientHeight : element.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, [axis]);

  const reserve = scrollPastEnd ? Math.max(0, available - (model.at(total - 1)?.extent ?? 100)) : 0;

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root>
        <IconButton
          icon='ph--caret-up--regular'
          iconOnly
          label='Previous'
          data-testid='window.prev'
          onClick={() => step(-1)}
        />
        <IconButton
          icon='ph--caret-down--regular'
          iconOnly
          label='Next'
          data-testid='window.next'
          onClick={() => step(1)}
        />
        <Toolbar.Separator />
        <IconButton
          icon='ph--arrow-line-up--regular'
          iconOnly
          label='Top'
          data-testid='window.top'
          onClick={() => controller.current?.scrollToIndex(0)}
        />
        <IconButton
          icon='ph--arrow-line-down--regular'
          iconOnly
          label='Bottom'
          data-testid='window.bottom'
          onClick={() => controller.current?.scrollToIndex(total - 1, 'end')}
        />
        {(append || prepend || grow) && <Toolbar.Separator />}
        {prepend && (
          <IconButton
            icon='ph--arrow-u-left-up--regular'
            iconOnly
            label='Prepend'
            data-testid='window.prepend'
            onClick={() =>
              model.prepend(
                Array.from({ length: 20 }, (_, index) => ({
                  id: `earlier-${model.count}-${index}`,
                  extent: EXTENT(index),
                })),
              )
            }
          />
        )}
        {append && (
          <IconButton
            icon='ph--arrow-u-right-down--regular'
            iconOnly
            label='Append'
            data-testid='window.append'
            onClick={() =>
              model.append(
                Array.from({ length: append === 'few' ? 5 : 20 }, (_, index) => ({
                  id: `later-${model.count}-${index}`,
                  extent: EXTENT(index),
                })),
              )
            }
          />
        )}
        {grow && (
          <IconButton
            icon='ph--arrows-out-line-vertical--regular'
            iconOnly
            label='Grow'
            data-testid='window.grow'
            // A change in place: same identity, new extent — the model says which row, and the
            // measurement pass finds the new size (§8).
            onClick={() => {
              const item = model.at(GROWN);
              if (item) {
                item.extent = 400;
                model.update(item.id);
              }
            }}
          />
        )}
      </Toolbar.Root>

      <div ref={bodyRef} className='dx-grow flex gap-2'>
        <Window
          classNames='dx-grow'
          model={model}
          extents={{ of: declared ?? ((index) => model.at(index)?.extent ?? 100), exact }}
          axis={axis}
          reserve={reserve}
          sticky={sticky}
          controllerRef={controller}
          onChange={setState}
          onEdge={onEdge}
          onMismatch={onMismatch}
        >
          {(index) => {
            const size = model.at(index)?.extent ?? 100;
            return (
              <div
                className={mx(
                  'flex items-center justify-center border border-separator text-xs tabular-nums',
                  index % 2 ? 'bg-input-surface' : 'bg-base-surface',
                  debug && 'outline outline-1 outline-dashed outline-primary-500/50',
                )}
                style={axis === 'block' ? { height: size } : { width: size }}
              >
                {debug ? `${index} · ${size}` : index}
              </div>
            );
          }}
        </Window>
      </div>

      <div className='px-2 py-1 flex gap-4 text-xs text-description tabular-nums' data-testid='placement.report'>
        <span data-testid='window.index'>{state?.index ?? 0}</span>
        <span data-testid='window.range'>
          {state ? `${state.visible.first}–${state.visible.last}` : '—'} of {state?.count ?? 0}
        </span>
        <span className='grow' />
        <span>{`edges ${edges.map(({ edge, delta }) => `${edge}${delta}`).join(' ') || '—'} · mismatch ${mismatches.join(' ') || '—'}`}</span>
      </div>
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-virtual/window',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    debug: { control: 'boolean' },
    scrollPastEnd: { control: 'boolean' },
  },
  // Listed in `args`, not only `argTypes`: the meta names no `component`, so storybook shows exactly
  // the args that are set and a control declared only in `argTypes` never appears.
  args: {
    count: 500,
    debug: false,
    scrollPastEnd: false,
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

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

/** The harness at rest, for the eye and the controls panel. No play. */
export const Default: Story = {
  args: { append: true, prepend: true, grow: true },
};

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
  args: { count: 200, append: true },
  play: async ({ canvasElement }) => {
    await settle();
    const before = probe(canvasElement);

    (canvasElement.querySelector('[data-testid="window.append"]') as HTMLElement).click();
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
  args: { count: 200, prepend: true },
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    scroller.scrollTop = 3_000;
    await settle();
    const before = probe(canvasElement);

    (canvasElement.querySelector('[data-testid="window.prepend"]') as HTMLElement).click();
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
  args: { count: 200, exact: false, grow: true },
  play: async ({ canvasElement }) => {
    await settle();
    const before = probe(canvasElement);
    // Grown at the top of the list rather than after a scroll: which rows are mounted depends on the
    // extent function, and a story that scrolls to a fixed offset and then names a fixed row is
    // asserting against wherever that row happened to be the day it was written. It named row 30 at
    // an offset that mounts rows 6–29, and read "the grow did nothing".
    if (!before.rows.has(GROWN)) {
      throw new Error(`row ${GROWN} should be mounted at the top; mounted ${[...before.rows.keys()].join(',')}`);
    }

    (canvasElement.querySelector('[data-testid="window.grow"]') as HTMLElement).click();
    await settle();

    const after = probe(canvasElement);
    const displaced = moved(before, after);
    await expect({
      before: displaced.filter((index) => index < GROWN),
      after: displaced.some((index) => index > GROWN),
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
  // Rows render at their real extent; the callback under-reports by 20px on every third row.
  args: {
    count: 100,
    exact: true,
    extent: EXTENT,
    declared: (index: number) => (index % 3 === 0 ? EXTENT(index) - 20 : EXTENT(index)),
  },
  play: async ({ canvasElement }) => {
    await settle();

    const report = canvasElement.querySelector('[data-testid="placement.report"]')!.textContent ?? '';
    await expect({ reported: /mismatch \d+:/.test(report) }).toEqual({ reported: true });
  },
};

/**
 * The chrome, which is outside the window and reads what it publishes.
 *
 * Tested because untested chrome is how a story ended up pinned to half the screen height without
 * anything failing: the assertions were all about the rows, and nothing asked whether what surrounds
 * them was right (§12).
 */
export const Chrome: Story = {
  args: { count: 200 },
  play: async ({ canvasElement }) => {
    await settle();
    const read = (testId: string) => canvasElement.querySelector(`[data-testid="${testId}"]`)!.textContent!.trim();
    const click = (testId: string) => (canvasElement.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();
    const { scroller } = probe(canvasElement);

    // The scroller fills what it is given, rather than a height somebody typed.
    const container = scroller.parentElement!.getBoundingClientRect();
    const filled = scroller.getBoundingClientRect().height >= container.height - 1;

    const start = read('window.index');
    click('window.next');
    await settle();
    const next = read('window.index');

    click('window.bottom');
    await settle();
    const bottom = probe(canvasElement);
    const atEnd = bottom.scroller.scrollTop > 0;

    click('window.top');
    await settle();
    const backToTop = read('window.index');

    // The rails (Outline, Minimap) live in react-ui-feed and are covered by its stories.
    await expect({
      filled,
      moved: next !== start,
      atEnd,
      backToTop,
      range: /^\d+–\d+ of 200$/.test(read('window.range')),
    }).toEqual({
      filled: true,
      moved: true,
      atEnd: true,
      backToTop: '0',
      range: true,
    });
  },
};

/**
 * The reserve is part of the resting view: "bottom" lands at the scroll maximum, with the reserved
 * space on screen below the tail.
 *
 * On the old design the reserve was a flag that special-cased the tail wherever it was consulted,
 * and it could never be stabilised. Here the host computes a number, the list adds it to the sizer,
 * and the end includes it; nothing else in the engine knows it happened (§7). This story's reserve
 * is a viewport's worth less one row, so at rest the last row sits at the top — the extreme case.
 */
export const PastEnd: Story = {
  args: { count: 200, scrollPastEnd: true },
  play: async ({ canvasElement }) => {
    await settle();
    const { scroller } = probe(canvasElement);

    (canvasElement.querySelector('[data-testid="window.bottom"]') as HTMLElement).click();
    await settle();
    const last = canvasElement.querySelector<HTMLElement>('[data-index="199"]');
    const atTop = !!last && Math.abs(last.getBoundingClientRect().top - scroller.getBoundingClientRect().top) <= 2;

    // The rest position is the scroll maximum: there is nothing further to scroll into.
    const room = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

    await expect({ atTop, settled: room <= 2 }).toEqual({ atTop: true, settled: true });
  },
};

/**
 * A feed pinned to its tail stays there as content arrives.
 *
 * The one thing the old engine spent the most machinery on — a follow, a sticky flag, a re-base and
 * a scroll listener that had to tell the reader apart from itself. Here it is a standing intent: at
 * the end, appending keeps you at the end; away from it, appending does not move you.
 */
export const Sticky: Story = {
  args: { count: 200, sticky: true, append: 'few' },
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const append = () => (canvasElement.querySelector('[data-testid="window.append"]') as HTMLElement).click();
    const atTail = (count: number) => {
      const last = canvasElement.querySelector<HTMLElement>(`[data-index="${count - 1}"]`);
      return !!last && Math.abs(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom) <= 2;
    };

    // Driven to the end first: the reader has to *be* at the tail for following it to mean anything.
    for (let attempt = 0; attempt < 8; attempt++) {
      scroller.scrollTop = scroller.scrollHeight;
      await settle(20);
    }

    const arrived = atTail(200);
    append();
    // The follow *travels* now (glide, ~2 rows/s) — arrival is by deceleration, not teleport, so
    // the reading is "lands and stays", polled to landing rather than sampled mid-flight.
    let followed = false;
    for (let frame = 0; frame < 300 && !followed; frame++) {
      await nextFrame();
      followed = atTail(205);
    }

    // And away from the tail it must not drag the reader: a feed that follows whatever the reader is
    // doing is a feed that cannot be read while it is busy. The wheel first — a scroll with no
    // gesture behind it is the machinery's, and the follow would undo it.
    scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }));
    scroller.scrollTop = 0;
    await settle();
    const away = Math.round(scroller.scrollTop);
    append();
    await settle();
    const stayed = Math.abs(scroller.scrollTop - away) <= 2;

    await expect({ arrived, followed, stayed }).toEqual({ arrived: true, followed: true, stayed: true });
  },
};
