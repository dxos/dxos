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
    (panel.querySelector('.cursor-pointer') as HTMLElement | null)?.click();
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
