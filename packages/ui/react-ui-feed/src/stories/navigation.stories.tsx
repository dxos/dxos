//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../testing/index.ts';

/**
 * Arrow keys step between the feed's stops, one press one stop.
 *
 * The property under test is that a press always moves, and always to the adjacent stop: a smooth
 * scroll passes through every range between here and its target, and the cursor follows the range
 * whenever the reader scrolls past it — so a navigation that does not defend its destination
 * overwrites it mid-flight and the next press steps from a row the animation was crossing. The
 * symptom is an arrow that sometimes moves and sometimes returns to the row it just left.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/stories/navigation',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

/** Frames to let a step settle: the travel is smooth, and the readout follows the range. */
const SETTLE_FRAMES = 30;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async () => {
  for (let frame = 0; frame < SETTLE_FRAMES; frame++) {
    await nextFrame();
  }
};

/**
 * The reading the complaint is about: where the feed actually is.
 *
 * Not the cursor readout, and not `scrollTop` either. The readout can name a neighbour while a stop
 * is still being measured; and the offset now absorbs the start edge's repayments — content and
 * scroll shift together so the reader sees nothing move, which also means the raw offset moves when
 * nothing did. The row under the top edge is what the reader sees, so a press's travel is read as
 * that row's index: ArrowUp must put an earlier row there, every time.
 */
const topRowOf = (canvasElement: HTMLElement): number => {
  const viewport = within(canvasElement).getByTestId('feed.viewport');
  const edge = viewport.getBoundingClientRect().top;
  const rows = [...viewport.querySelectorAll<HTMLElement>('[data-index]')];
  const row = rows.find((element) => element.getBoundingClientRect().bottom > edge + 1);
  return row ? Number(row.dataset.index) : -1;
};

const press = async (viewport: HTMLElement, key: 'ArrowUp' | 'ArrowDown') => {
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  // A step glides now, so "after the press" means after the travel lands: polled to a scroll that
  // has held still for a dozen frames, not a fixed wait that encodes one machine's glide speed.
  let still = 0;
  let last = viewport.scrollTop;
  for (let frame = 0; frame < 300 && still < 12; frame++) {
    await nextFrame();
    const current = viewport.scrollTop;
    still = Math.abs(current - last) < 1 ? still + 1 : 0;
    last = current;
  }
};

/** Passive: the feed with its stops, for driving by hand. */
export const Default: Story = {
  args: { scenario: 'assistant', count: 200 },
};

/**
 * Every press moves, and lands on a stop.
 *
 * `assistant` makes every second message a prompt and only prompts are stops, so a stop is an even
 * index — which is what makes "landed on a stop" checkable rather than merely "moved". The first
 * press is the odd one out: the feed opens on the last message, an answer, so the nearest stop above
 * it is one index away where every step afterwards is two.
 */
export const Arrows: Story = {
  args: { scenario: 'assistant', count: 60 },
  play: async ({ canvasElement }) => {
    const viewport = within(canvasElement).getByTestId('feed.viewport');
    await settle();

    // Asserted as the whole path of top-row indices: every ArrowUp must put an earlier row under
    // the top edge, so a failure names the press that stalled and what it did instead.
    const rows = [topRowOf(canvasElement)];
    for (let step = 0; step < 5; step++) {
      await press(viewport, 'ArrowUp');
      rows.push(topRowOf(canvasElement));
    }

    const stalled = rows.slice(1).filter((row, step) => row >= rows[step]);
    await expect({ rows, stalled }).toEqual({ rows, stalled: [] });

    // And the other way: `ArrowDown` returns towards the tail it came from. Near the end a stop's
    // start can lie beyond the maximum offset, so "already at max scroll" counts as arrived rather
    // than as a stall — the feed cannot advance the top row past what the viewport can hold.
    const back = [topRowOf(canvasElement)];
    const progressed: boolean[] = [];
    for (let step = 0; step < 5; step++) {
      const wasAtMax = viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 2;
      await press(viewport, 'ArrowDown');
      back.push(topRowOf(canvasElement));
      const atMax = viewport.scrollTop >= viewport.scrollHeight - viewport.clientHeight - 2;
      // A press made progress if the top row advanced, or it carried the viewport to (or held it
      // at) the maximum — the last stop's start can lie beyond what the viewport can scroll to.
      progressed.push(back[step + 1] > back[step] || atMax || wasAtMax);
    }

    const stalls = progressed.filter((ok) => !ok);
    await expect({ back, stalls }).toEqual({ back, stalls: [] });
  },
};

/**
 * The same property where every message is a stop.
 *
 * `plain` names no `isAnchor`, so a press steps one message — and its rows are tall and unequal,
 * which is the case where the offset moves furthest between two stops.
 */
export const Plain: Story = {
  args: { scenario: 'plain', count: 60 },
  play: async ({ canvasElement }) => {
    const viewport = within(canvasElement).getByTestId('feed.viewport');
    await settle();

    const rows = [topRowOf(canvasElement)];
    for (let step = 0; step < 5; step++) {
      await press(viewport, 'ArrowUp');
      rows.push(topRowOf(canvasElement));
    }

    const stalled = rows.slice(1).filter((row, step) => row >= rows[step]);
    await expect({ rows, stalled }).toEqual({ rows, stalled: [] });
  },
};

/**
 * Presses faster than the glide: each must still take one stop.
 *
 * A step mid-travel that re-derives its base from the scroll offset finds the stop it is already
 * heading to and goes there again — the press is swallowed, which a reader at a toolbar feels as a
 * button that "does not reliably move". The navigation chains from the pending destination instead,
 * so three fast presses land three stops away, wherever the glide had got to.
 */
export const RapidArrows: Story = {
  args: { scenario: 'assistant', count: 60 },
  play: async ({ canvasElement }) => {
    const viewport = within(canvasElement).getByTestId('feed.viewport');
    await settle();

    const before = topRowOf(canvasElement);
    // Three presses inside one glide's travel time — no settling between.
    for (let step = 0; step < 3; step++) {
      viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      await nextFrame();
    }

    // Then let the travel land.
    let still = 0;
    let last = viewport.scrollTop;
    for (let frame = 0; frame < 400 && still < 12; frame++) {
      await nextFrame();
      const current = viewport.scrollTop;
      still = Math.abs(current - last) < 1 ? still + 1 : 0;
      last = current;
    }

    // Three stops on the assistant scenario is three prompts — several rows, not one.
    const after = topRowOf(canvasElement);
    await expect({ before, after, travelled: before - after >= 3 }).toEqual({
      before,
      after,
      travelled: true,
    });
  },
};
