//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/MessageList',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: {
    count: 100,
    scrollPastEnd: true,
  },
  argTypes: {
    debug: { control: 'boolean' },
    scrollPastEnd: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

//
// The five downstream call sites, approximated.
//
// One engine, five hosts: each story changes only the renderer, the chrome and whether the feed
// follows its tail. What differs — and what each one still needs from the engine — is tabulated in
// `plugin-assistant/docs/AUDIT.md` §3.4.
//

/** AI chat (`plugin-assistant`): prompts, answers, reasoning, tool calls, suggestions. */
export const Assistant: Story = {
  args: {
    scenario: 'assistant',
    count: 200,
  },
};

/** Email conversation (`plugin-inbox/ConversationStack`): HTML bodies, read from the top. */
export const Email: Story = {
  args: {
    scenario: 'email',
    count: 200,
  },
};

/** Human chat (`react-ui-thread`): short turns, many of them, pinned to the tail. */
export const Thread: Story = {
  args: {
    scenario: 'thread',
    count: 500,
  },
};

/** Comments (`react-ui-thread` via `plugin-review`): anchored to a document, resolvable. */
export const Comments: Story = {
  args: {
    scenario: 'comments',
    count: 200,
  },
};

/** Transcription (`react-ui-transcription`): one utterance per row, arriving as it is spoken. */
export const Transcript: Story = {
  args: {
    scenario: 'transcript',
    count: 500,
  },
};

//
// The engine's own stories: a synthetic mixed feed, which is what the measurements were taken over.
//

/** Mixed markdown / html / code items — the realistic feed. */
export const Small: Story = {
  args: {
    count: 20,
  },
};

export const Medium: Story = {
  args: {
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
    count: 0,
    streaming: true,
  },
};
