//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/components/MessageList',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: {
    count: 100,
    tailLines: 4,
  },
  argTypes: {
    debug: { control: 'boolean' },
    tailLines: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

//
// Size and stress variants of the one realistic feed. Everything here renders the assistant
// scenario — real chat turns, per-message chrome, block widgets — because a size story over
// synthetic filler answers questions about the filler. The call-site sims (email, thread,
// comments, transcript) were dropped by decision; the flagship (`assistant/*`) is the use case.
//

/** Passive: the assistant-shaped feed under the shared harness. */
export const Default: Story = {
  args: {
    scenario: 'assistant',
    count: 200,
  },
};

export const Small: Story = {
  args: {
    scenario: 'assistant',
    count: 20,
  },
};

export const Medium: Story = {
  args: {
    scenario: 'assistant',
    count: 100,
  },
};

/**
 * Scroll-quality case: the deciding criterion is smoothness here, not at 200.
 *
 * The statusbar's right-hand readout is `fps · worst frame · hitches`, sampled from animation
 * frames and reset by clicking it. It has to be read at a real keyboard — an agent's browser
 * throttles `requestAnimationFrame`, so any number collected there describes the harness.
 *
 * Test:
 * 1. Click the frame readout to reset it, then fling-scroll the list from top to bottom twice.
 * 2. Read `fps` while the scroll is running: it should hold near the display's rate.
 * 3. Read `worst` and `hitches` after it settles — one 200ms stall reads as smooth in an average
 *    and as broken to a reader, which is why they are reported separately.
 * 4. Watch the scrollbar thumb during the fling: it should not jump backwards as rows measure.
 */
export const Large: Story = {
  args: {
    scenario: 'assistant',
    count: 2_000,
  },
};

/**
 * A bad height estimate is what scrollbar drift looks like; compare against `Large`.
 *
 * Test:
 * 1. Reset the frame readout and fling-scroll to the middle of the list.
 * 2. Compare `worst` and `hitches` against `Large` — the cost of measurement correction is the
 *    difference between the two stories, since nothing else changes.
 * 3. Hold at one position for a second: the rows must not creep once measurement catches up.
 */
export const BadEstimate: Story = {
  args: {
    scenario: 'assistant',
    count: 2_000,
    estimateSize: 24,
  },
};

/**
 * A model answering into the tail, from nothing, until stopped. The answer arrives in word chunks
 * and re-parses as markdown (heading, list, code fence) while the row it lives in grows.
 *
 * Test:
 * 1. Reset the frame readout and let three or four turns arrive.
 * 2. Read `fps` while the tail grows — the follow runs on animation frames, so it competes with
 *    the item re-parsing its markdown, and this is where they collide.
 * 3. Scroll away mid-answer: the follow must stop and stay stopped.
 * 4. Scroll back to the tail: it must resume following without a jump.
 */
export const Streaming: Story = {
  args: {
    scenario: 'assistant',
    count: 0,
    streaming: true,
  },
};
