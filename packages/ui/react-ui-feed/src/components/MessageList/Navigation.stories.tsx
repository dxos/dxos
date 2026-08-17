//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

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
  title: 'ui/react-ui-feed/baseline/navigation',
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
 * Deliberately not the cursor readout. That is the row the scroll offset falls inside, and a row not
 * yet measured is placed from an estimate — so arriving at a stop and measuring around it can leave
 * the offset in the row above or below, and the readout reports a neighbour. The scroll position is
 * what the reader sees, and a press that does not change it is a press that did nothing.
 */
const scrollOf = (canvasElement: HTMLElement): number =>
  Math.round(within(canvasElement).getByTestId('feed.viewport').scrollTop);

/**
 * What the tests assert, and why it is not "one row per press".
 *
 * Every ArrowUp must move the feed **towards the top** — never nowhere, and never the other way.
 * That is the defect this file exists for: opened at its tail the feed used to align to its *last*
 * row while its first visible row was several earlier, so the first presses stepped through rows
 * already on screen and scrolled nothing, and `getOffsetForIndex` then answered with an offset
 * *below* the current one, scrolling down in response to ArrowUp.
 *
 * Distance is asserted too: a press moves by a stop, and a stop is at least a row, so anything
 * smaller is the feed nudging itself inside a row it is already in.
 */
const MIN_TRAVEL = 20;

const press = async (viewport: HTMLElement, key: 'ArrowUp' | 'ArrowDown') => {
  viewport.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await settle();
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

    const scrolls = [scrollOf(canvasElement)];
    for (let step = 0; step < 5; step++) {
      await press(viewport, 'ArrowUp');
      scrolls.push(scrollOf(canvasElement));
    }

    // Asserted as a whole path rather than per step: a failure then names the press that stalled and
    // shows what it did instead, where a per-step assertion only reports that one did.
    const travel = scrolls.slice(1).map((top, step) => scrolls[step] - top);
    await expect({ scrolls, backwards: travel.filter((distance) => distance < 0) }).toEqual({
      scrolls,
      backwards: [],
    });
    await expect(scrolls.at(-1)!).toBeLessThan(scrolls[0]);
    // A press moves by a stop, and a stop is at least a row. Anything smaller is the feed nudging
    // itself inside a row it is already in, which reads as a press that did nothing.
    await expect({ travel, stalled: travel.filter((distance) => distance < MIN_TRAVEL) }).toEqual({
      travel,
      stalled: [],
    });

    const back: number[] = [];
    for (let step = 0; step < 5; step++) {
      await press(viewport, 'ArrowDown');
      back.push(scrollOf(canvasElement));
    }

    // And the other way: `ArrowDown` returns towards the tail it came from.
    await expect({ back, backwards: back.filter((top, step) => step > 0 && top < back[step - 1]) }).toEqual({
      back,
      backwards: [],
    });
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

    const scrolls = [scrollOf(canvasElement)];
    for (let step = 0; step < 5; step++) {
      await press(viewport, 'ArrowUp');
      scrolls.push(scrollOf(canvasElement));
    }

    const travel = scrolls.slice(1).map((top, step) => scrolls[step] - top);
    await expect({ scrolls, backwards: travel.filter((distance) => distance < 0) }).toEqual({
      scrolls,
      backwards: [],
    });
    await expect(scrolls.at(-1)!).toBeLessThan(scrolls[0]);
    await expect({ travel, stalled: travel.filter((distance) => distance < MIN_TRAVEL) }).toEqual({
      travel,
      stalled: [],
    });
  },
};
