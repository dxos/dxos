//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

/**
 * The bisection ladder for scroll stability.
 *
 * Each rung adds one thing to the one before it, so a defect can be attributed rather than guessed
 * at: if a rung is still and the next one moves, the difference between them is the cause. The
 * statusbar's `jumps` (rows moving on screen against the scroll, sampled per frame) and `shifts`
 * (rows whose offset changed after layout) are the readings; both should be zero on a still feed.
 *
 * 1. **Plain** — no editor at all, every row a fixed height declared in advance. Nothing here can be
 *    measured wrong, so any movement belongs to the list itself.
 * 2. **Uniform** — one editor per row, every row the identical document, so a single estimate is
 *    exactly right for all of them. What this adds over Plain is CodeMirror construction.
 * 3. **Varied** — one editor per row, contents of different lengths, so the estimate is wrong for
 *    most rows and the list corrects as it goes. What this adds is measurement error.
 *
 * Above the ladder sit the call-site stories (`MessageList/Assistant` and friends), which add
 * per-message renderers, block widgets and streaming.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/baseline',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { count: 500 },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

/** Rung 1: fixed heights, no editor. If this moves, the list is at fault. */
export const Plain: Story = {
  args: {
    scenario: 'plain',
  },
};

/** Rung 2: an editor per row, all identical — adds CodeMirror construction. */
export const Uniform: Story = {
  args: {
    scenario: 'uniform',
  },
};

/** Rung 3: an editor per row, varied lengths — adds measurement error. */
export const Varied: Story = {
  args: {
    scenario: 'thread',
  },
};
