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

/** The cursor, read from the stats panel rather than from React — what the reader is told. */
const cursorOf = (canvasElement: HTMLElement): number =>
  Number(within(canvasElement).getByTestId('feed.index').textContent?.split('/')[0]?.trim());

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

    const up: number[] = [];
    for (let step = 0; step < 5; step++) {
      await press(viewport, 'ArrowUp');
      up.push(cursorOf(canvasElement));
    }

    // Asserted as whole paths rather than per step: a failure then names the press that stalled and
    // shows what it did instead, where a per-step assertion only reports that one did.
    await expect({
      path: up,
      moved: up.every((index, step) => step === 0 || index < up[step - 1]),
      stops: up.every((index) => index % 2 === 0),
    }).toEqual({ path: up, moved: true, stops: true });

    const down: number[] = [];
    for (let step = 0; step < 4; step++) {
      await press(viewport, 'ArrowDown');
      down.push(cursorOf(canvasElement));
    }

    // The same stops in the other direction: a press that lands between two of them, or that fails
    // to move at all, retraces a different path back.
    await expect(down).toEqual([...up].reverse().slice(1));
  },
};
