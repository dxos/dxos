//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef, useState } from 'react';
import { expect } from 'storybook/test';

import { IconButton, Toolbar } from '@dxos/react-ui';
import { type WindowController } from '@dxos/react-ui-virtual';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { type FeedScenario, MessageWindow, createScenario } from '../testing';

/**
 * Real messages, placed by the new module.
 *
 * `placement/*` proves the shape against boxes that cannot lie about their size, and `baseline/*`
 * proves the current engine against real editors. This is where they meet: the same fixtures, the
 * same renderers and the same chrome as a feed, placed by `Window`. The invariants are deliberately
 * the ones `baseline/*` already asserts — a replacement is ready when it satisfies the tests the
 * thing it replaces satisfies, not when it satisfies tests written for it.
 *
 * Not wired into `MessageList.Root`: Root owns the follow, the sticky tail, the anchors and the
 * cursor as well as the virtualizer, so swapping the placement inside it is a reimplementation. This
 * is what that reimplementation will be checked against.
 */
/** The fixed reserve the past-end story keeps below the tail — part of the resting view. */
const RESERVE = 96;

const DefaultStory = ({
  scenario,
  count,
  sticky,
  scrollPastEnd,
}: {
  scenario: FeedScenario;
  count: number;
  sticky?: boolean;
  scrollPastEnd?: boolean;
}) => {
  const definition = useMemo(() => createScenario({ scenario, count }), [scenario, count]);
  const [extra, setExtra] = useState<Message.Message[]>([]);
  const controller = useRef<WindowController>(null);
  const messages = useMemo(() => [...definition.messages, ...extra], [definition.messages, extra]);

  const bodyRef = useRef<HTMLDivElement>(null);

  return (
    <div className='flex flex-col h-full'>
      <Toolbar.Root>
        <IconButton
          icon='ph--plus--regular'
          iconOnly
          label='Append'
          data-testid='bridge.append'
          onClick={() =>
            setExtra((all) => [
              ...all,
              Message.make({
                sender: { role: 'assistant', name: 'Assistant' },
                blocks: [{ _tag: 'text', text: `Arrived ${all.length}` }],
              }),
            ])
          }
        />
        <IconButton
          icon='ph--arrow-line-down--regular'
          iconOnly
          label='Bottom'
          data-testid='bridge.bottom'
          onClick={() => controller.current?.scrollToIndex(messages.length - 1, 'end')}
        />
      </Toolbar.Root>
      <div ref={bodyRef} className='dx-grow'>
        <MessageWindow
          messages={messages}
          renderer={definition.renderer}
          Chrome={definition.Chrome}
          Custom={definition.Custom}
          estimateSize={definition.estimateSize}
          sticky={sticky}
          reserve={scrollPastEnd ? RESERVE : 0}
          controllerRef={controller}
        />
      </div>
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-feed/stories/bridge',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async (frames = 40) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

/**
 * Nothing moves once it has settled.
 *
 * The same reading `baseline/fill` takes of the current engine: rows are tracked by index, and with
 * nothing scrolling the feed, a mounted row that moves is a defect. It is the first invariant the
 * replacement has to satisfy, and the one the old engine could only satisfy by correcting itself
 * afterwards.
 */
const holdsStill = (scenario: FeedScenario, count: number): Story => ({
  args: { scenario, count },
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const read = () =>
      new Map(
        [...scroller.querySelectorAll<HTMLElement>('[data-index]')].map((row) => [
          Number(row.dataset.index),
          Math.round(row.getBoundingClientRect().top),
        ]),
      );

    // Settle first: the first fill measures, and measuring is allowed to move things.
    await settle();
    const before = read();
    await settle(60);
    const after = read();

    const moved = [...after].filter(([index, top]) => before.has(index) && Math.abs(before.get(index)! - top) > 1);

    // And the end has to be reachable, which is what says the extents are real.
    //
    // "Nothing moved" alone is satisfied by a list that never measures anything — verified by
    // disabling measurement, at which point the story still passed. Scrolling to the end exercises
    // the sizer, and the sizer is only right if the measured extents reached it.
    // Driven to the end rather than sent there once. The extents are estimates, so measuring the
    // rows the scroll reveals grows the document under it — one assignment lands short of an end
    // that was not yet as far away as it turned out to be. A reader dragging a scrollbar does the
    // same thing repeatedly; what has to be true is that the end is reachable, and that it settles.
    let previous = -1;
    for (let attempt = 0; attempt < 8 && scroller.scrollTop !== previous; attempt++) {
      previous = scroller.scrollTop;
      scroller.scrollTop = scroller.scrollHeight;
      await settle(20);
    }

    const last = scroller.querySelector<HTMLElement>(`[data-index="${count - 1}"]`);
    const rests =
      !!last && Math.abs(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom) <= 2;

    await expect({ mounted: after.size > 0, moved: moved.map(([index]) => index), rests }).toEqual({
      mounted: true,
      moved: [],
      rests: true,
    });
  },
});

/** The bridge passively: real messages on the window, nothing asserted. */
export const Default: Story = {
  args: { scenario: 'assistant', count: 200, sticky: true },
};

/** Fixed-height rows, no editor: whatever moves here is the placement and nothing else. */
export const Plain: Story = holdsStill('plain', 200);

/** One editor per row, all identical. */
export const Uniform: Story = holdsStill('uniform', 200);

/** A chat's shape: per-message renderers, block widgets, a per-message estimate. */
export const Assistant: Story = holdsStill('assistant', 200);

/**
 * A chat's tail: the last message rests on the bottom, and stays there as answers arrive.
 *
 * The invariant `baseline/tail` holds the current engine to, pointed at the new one. Read from the
 * last row's own bottom edge rather than the scroll offset: an offset can be at the document's end
 * while the last message is nowhere near the screen, which is what both of that story's defects
 * looked like from outside.
 *
 * It failed for a while, and what it caught was not the tail arithmetic either time. First a stale
 * `getId` — `Window` held the closure it was constructed with, so an appended row's measurement was
 * filed under one id and read back under another and the row was re-measured every commit, which
 * React ends by exceeding the update limit. Then a follow re-derived from proximity, which its own
 * corrections disengage. Both presented as "the tail is in the wrong place".
 */
export const Tail: Story = {
  args: { scenario: 'assistant', count: 200, sticky: true },
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const rests = (count: number) => {
      const last = canvasElement.querySelector<HTMLElement>(`[data-index="${count - 1}"]`);
      return !!last && Math.abs(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom) <= 2;
    };

    (canvasElement.querySelector('[data-testid="bridge.bottom"]') as HTMLElement).click();
    // Arrival is by correction rounds — the jump lands on estimates and the follow finishes the
    // journey against the rendered edge — so it is polled, not sampled.
    let arrived = false;
    for (let frame = 0; frame < 300 && !arrived; frame++) {
      await nextFrame();
      arrived = rests(200);
    }

    // An answer arrives while the reader is at the tail. The follow glides (~2 rows/s), so the
    // reading polls to landing — arrival by deceleration is the contract, not instant arrival.
    (canvasElement.querySelector('[data-testid="bridge.append"]') as HTMLElement).click();
    let followed = false;
    for (let frame = 0; frame < 300 && !followed; frame++) {
      await nextFrame();
      followed = rests(201);
    }

    await expect({ arrived, followed }).toEqual({ arrived: true, followed: true });
  },
};

/**
 * The tail, with a fixed reserve past it — part of the resting view.
 *
 * The old engine could not reserve at all: its reserve was a DOM spacer, so the element and the
 * virtualizer disagreed about where the document ends. Here the reserve is a term in the sizer, in
 * the same coordinate system, and the rest position includes it: the tail sits the reserve's
 * extent clear of the viewport's edge (breathing room above a composer), at the scroll maximum.
 */
export const VariedPastEnd: Story = {
  args: { scenario: 'thread', count: 500, sticky: true, scrollPastEnd: true },
  play: async ({ canvasElement }) => {
    await settle(60);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;

    // Read from the last row's own bottom edge: an offset can be at the document's end while the
    // last message is nowhere near the screen, which is exactly what the defect looked like.
    // Polled to landing: the follow glides over measurement corrections rather than teleporting.
    const restingOf = () => {
      const last = canvasElement.querySelector<HTMLElement>('[data-index="499"]');
      return last && Math.round(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom);
    };
    let resting = restingOf();
    for (let frame = 0; frame < 300 && Math.abs((resting ?? 999) + RESERVE) > 2; frame++) {
      await nextFrame();
      resting = restingOf();
    }
    const last = canvasElement.querySelector<HTMLElement>('[data-index="499"]');

    // At rest the reserve is on screen, so there is nothing further to scroll into.
    const room = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;

    await expect({
      mounted: !!last,
      resting: Math.abs((resting ?? 999) + RESERVE) <= 2,
      settled: room <= 2,
    }).toEqual({
      mounted: true,
      resting: true,
      settled: true,
    });
  },
};

/**
 * Scrolling moves the content by exactly what was scrolled, and by nothing else.
 *
 * Reported from a real session as the feed "jumping as soon as it starts to scroll". Measurement
 * *is* allowed to move things — a row that turns out taller pushes the rows after it, and that is
 * the list working — so the reading is the row the reader is looking at: whatever is under the top
 * of the viewport when a step begins must be exactly one step higher when it ends.
 *
 * That is what a re-base breaks and what an anchor cannot: re-basing the document rewrites every
 * position including the ones above the reader, so a correction anywhere lands as a jump here.
 */
export const Scrolling: Story = {
  args: { scenario: 'thread', count: 500 },
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const top = () => scroller.getBoundingClientRect().top;
    // The row under the top of the viewport, and where it is relative to that edge.
    const at = () => {
      const rows = [...scroller.querySelectorAll<HTMLElement>('[data-index]')];
      const edge = top();
      const row = rows.find((element) => element.getBoundingClientRect().bottom > edge + 1);
      return row && { index: row.dataset.index!, offset: row.getBoundingClientRect().top - edge };
    };

    // Upward, from the tail, which is the only direction that can tell the two designs apart. Going
    // down, every row above the reader has already been measured, so a prefix sum from index 0 and
    // an anchor-relative position agree exactly. Going up, the rows arriving above are estimates
    // being replaced — and under a prefix sum each replacement pushes everything below it, including
    // what the reader is reading.
    (canvasElement.querySelector('[data-testid="bridge.bottom"]') as HTMLElement).click();
    await settle(40);

    const jumps: { from: number; index: string; moved: number }[] = [];
    for (let step = 0; step < 12; step++) {
      const before = at();
      const from = scroller.scrollTop;
      scroller.scrollTop = from - 240;
      await settle(8);
      const row = before && scroller.querySelector<HTMLElement>(`[data-index="${before.index}"]`);
      if (!before || !row) {
        continue;
      }

      // Against the reader's own write, not the net scrollTop delta: repaying the start edge moves
      // content and scroll together, so the offset absorbs the machine's shift while the row under
      // the eye moves by exactly what the reader asked — which is the invariant.
      const moved = before.offset - (row.getBoundingClientRect().top - top());
      if (Math.abs(moved - -240) > 2) {
        jumps.push({ from, index: before.index, moved: Math.round(moved) });
      }
    }

    await expect(jumps).toEqual([]);
  },
};

/**
 * The top of the conversation exists.
 *
 * A feed opened at its tail derives every position above the reader from estimates; rows measuring
 * taller than assumed push row 0 negative, where no scroll can reach it — the reader arrives at the
 * top and the first messages are simply not there (seen live: the flagship opened with its first
 * prompt missing). The start edge is repaid by shifting content and scroll together, so this drives
 * to the top and asks the one absolute fact of content space: row 0 starts at zero.
 */
export const Top: Story = {
  args: { scenario: 'thread', count: 300, sticky: true },
  play: async ({ canvasElement }) => {
    await settle(40);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;

    // Driven repeatedly: each ascent mounts rows whose measurement re-bases the top.
    let previous = -1;
    for (let attempt = 0; attempt < 10 && scroller.scrollTop !== previous; attempt++) {
      previous = scroller.scrollTop;
      scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }));
      scroller.scrollTop = 0;
      await settle(20);
    }

    const first = scroller.querySelector<HTMLElement>('[data-index="0"]');
    const resting = !!first && Math.abs(first.getBoundingClientRect().top - scroller.getBoundingClientRect().top) <= 2;

    await expect({ mounted: !!first, resting, atZero: scroller.scrollTop === 0 }).toEqual({
      mounted: true,
      resting: true,
      atZero: true,
    });
  },
};
