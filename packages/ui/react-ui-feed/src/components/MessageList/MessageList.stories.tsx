//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/MessageList',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { count: 200 },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

/** Mixed markdown / html / code items — the realistic feed. */
export const Default: Story = {};

/** Scroll-quality case: the deciding criterion is smoothness here, not at 200. */
export const Large: Story = {
  args: { count: 2_000 },
};

/** A bad height estimate is what scrollbar drift looks like; compare against `Default`. */
export const BadEstimate: Story = {
  args: { count: 2_000, estimateSize: 24 },
};

/**
 * A model answering into the tail, from nothing, until stopped. The answer arrives in word chunks
 * and re-parses as markdown (heading, list, code fence) while the row it lives in grows.
 */
export const Streaming: Story = {
  args: { count: 0, streaming: true },
};
