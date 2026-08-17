//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

/**
 * A widget the reader opened stays open when its row leaves the window and comes back.
 *
 * This is the one blocker on retrofitting `plugin-assistant`, whose tool panels are exactly this: a
 * disclosure whose open flag is React state inside the widget, which dies with the item. In a
 * thread that is one long document the question never arises, because nothing ever unmounts.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/baseline/widget-state',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { scenario: 'assistant', count: 200, debug: false },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** Row re-placements one disclosure costs today: 177 over 19 frames, ~11 rows a frame. */
const REPLACEMENT_CEILING = 260;

const settle = async (frames = 30) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

export const Reopened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viewport = canvas.getByTestId('feed.viewport');
    await settle();

    // The row is identified by its message, not its position: the point of the test is that the row
    // is destroyed in between, so anything positional would be describing a different row.
    const panel = canvas.getAllByTestId('feed.widget')[0];
    const row = panel.closest('[data-object-id]') as HTMLElement;
    const id = row.dataset.objectId!;
    // The header is the toggle: `TogglePanel.Header` carries the click handler, and it is the first
    // element inside the panel's content.
    // Sampled across the toggle's animation: a row that grows re-places every row after it, and with
    // rows positioned absolutely that re-placement is ours to do, per frame, for every row below.
    const tops = () =>
      new Map(
        [...viewport.querySelectorAll<HTMLElement>('[data-index]')].map((element) => [
          Number(element.dataset.index),
          Math.round(element.getBoundingClientRect().top),
        ]),
      );

    const trace: number[] = [];
    let previous = tops();
    (panel.querySelector('.cursor-pointer') as HTMLElement | null)?.click();
    for (let frame = 0; frame < 40; frame++) {
      await nextFrame();
      const current = tops();
      trace.push([...current].filter(([index, top]) => previous.has(index) && previous.get(index) !== top).length);
      previous = current;
    }

    // Pinned, not aspired to: this is what absolute placement costs today, and it is the number the
    // move to flow layout is meant to take to nearly zero. Rows are placed by transform, so every row
    // below the one that grew is re-placed by us, on every frame of the animation. In normal flow the
    // browser does it in the same frame for nothing. Kept as a ceiling so the cost cannot grow
    // unnoticed before that change lands, and so the change has something to prove itself against.
    const moves = trace.reduce((total, count) => total + count, 0);
    await expect({ moves: moves <= REPLACEMENT_CEILING }).toEqual({ moves: true });
    await settle();
    await expect(panel.dataset.open).toEqual('true');

    // Far enough that the row is unmounted, not merely off screen. The wheel event first: the feed
    // follows its tail, and a scroll it cannot attribute to the reader is one it will undo.
    viewport.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 }));
    viewport.scrollTop = 0;
    await settle();
    await expect(viewport.querySelector(`[data-object-id="${id}"]`)).toBeNull();

    viewport.scrollTop = viewport.scrollHeight;
    await settle();
    const reopened = viewport.querySelector(`[data-object-id="${id}"]`)?.querySelector('[data-testid="feed.widget"]');
    await expect((reopened as HTMLElement | null)?.dataset.open).toEqual('true');
  },
};
