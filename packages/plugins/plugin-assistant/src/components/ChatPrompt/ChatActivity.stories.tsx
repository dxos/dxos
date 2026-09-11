//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import { type RequestPhase } from '@dxos/assistant';
import type * as Trace from '@dxos/compute/Trace';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatActivity } from './ChatActivity.tsx';

const meta = {
  title: 'plugins/plugin-assistant/components/ChatActivity',
  component: ChatActivity,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChatActivity>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {},
};

/** `detail` carries the server count, as `connectMcpServers` emits it. */
export const Connecting: Story = {
  args: {
    activity: {
      phase: 'connecting-mcp',
      detail: '3',
    },
  },
};

/** The tool's name is part of the sentence, not a separate field. */
export const CallingTool: Story = {
  args: {
    activity: {
      phase: 'calling-tool',
      detail: 'search',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity')).toHaveTextContent('Calling tool search');
  },
};

/**
 * A settled turn with an alarm pending: the wait until the agent wakes itself is still activity.
 *
 * The wake time is resolved at render rather than in `args`, which are evaluated once at module load
 * and would have drifted by seconds before the story mounts.
 */
export const Waking: StoryObj<typeof meta> = {
  render: () => {
    const [wakeAt] = useState(() => Date.now() + 25_000);
    return <ChatActivity wakeAt={wakeAt} />;
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity')).toHaveTextContent(
      /Waking up in \d+ seconds/,
    );
  },
};

/** A running turn supersedes a pending alarm: the turn is the more immediate answer. */
export const RunningWithAlarm: Story = {
  args: {
    activity: { phase: 'generating' },
    wakeAt: Date.now() + 25_000,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity')).toHaveTextContent('Generating');
  },
};

export const Preparing: Story = {
  args: {
    activity: {
      phase: 'preparing',
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity')).toHaveTextContent('Preparing request');
  },
};

/** The first attempt is just the request, so no attempt count is shown. */
export const ContactingProvider: Story = {
  args: {
    activity: {
      phase: 'contacting-provider',
      attempt: 1,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('assistant.chat-activity')).toHaveTextContent('Contacting inference provider');
    await expect(canvas.queryByTestId('assistant.chat-activity.attempt')).toBeNull();
  },
};

/** A re-issued request: the reader is told the wait is a retry rather than a stall. */
export const Retrying: Story = {
  args: {
    activity: {
      phase: 'contacting-provider',
      attempt: 3,
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity.attempt')).toHaveTextContent('attempt 3');
  },
};

/** One scripted step of {@link Sequence}: what to show, and for how long. */
type Step = {
  activity?: Trace.PayloadType<typeof RequestPhase>;
  /** Milliseconds to hold before the next step. */
  hold: number;
  /** Streamed reply so far, standing in for the thread above the footer. */
  reply?: string;
};

// Holds are what a reader actually waits through, compressed: a cold MCP server or a summarization
// pass runs for seconds, and the retry spacing is `INSUFFICIENT_PERMISSIONS_RETRY_DELAY`.
const STEPS: Step[] = [
  { activity: { phase: 'starting' }, hold: 900 },
  { activity: { phase: 'preparing' }, hold: 700 },
  { activity: { phase: 'loading-history' }, hold: 900 },
  { activity: { phase: 'summarizing' }, hold: 1600 },
  { activity: { phase: 'connecting-mcp', detail: '3' }, hold: 1600 },
  { activity: { phase: 'building-toolkit' }, hold: 700 },
  { activity: { phase: 'encoding-prompt' }, hold: 700 },
  { activity: { phase: 'contacting-provider', attempt: 1 }, hold: 1200 },
  { activity: { phase: 'contacting-provider', attempt: 2 }, hold: 1400 },
  { activity: { phase: 'contacting-provider', attempt: 3 }, hold: 1400 },
  // The reply streams under a line that keeps reporting: the generation, then each tool call.
  { activity: { phase: 'generating' }, hold: 500, reply: 'The' },
  { activity: { phase: 'generating' }, hold: 400, reply: 'The retry' },
  { activity: { phase: 'generating' }, hold: 400, reply: 'The retry is now visible' },
  { activity: { phase: 'calling-tool', detail: 'search' }, hold: 1400, reply: 'The retry is now visible' },
  { activity: { phase: 'calling-tool', detail: 'read_file' }, hold: 1400, reply: 'The retry is now visible' },
  { activity: { phase: 'generating' }, hold: 900, reply: 'The retry is now visible instead of a dead pause.' },
  // Only the settled turn clears it — unless an alarm is pending, which the wake line reports.
  { hold: 2000, reply: 'The retry is now visible instead of a dead pause.' },
];

/**
 * The turn as the reader experiences it: setup phases advancing in the order a turn enters them, the
 * provider request re-issued twice, the generation, the tool calls that dominate an agentic turn,
 * and the line finally vanishing when the turn settles.
 *
 * A story rather than a set of args because the sequence is the behaviour under test — the phases
 * are only meaningful in order, and the clear-on-settle is the half a static render cannot show.
 */
export const Sequence: StoryObj<typeof meta> = {
  render: () => {
    const [index, setIndex] = useState(0);
    const step = STEPS[index];

    useEffect(() => {
      if (index >= STEPS.length - 1) {
        return;
      }

      const timeout = setTimeout(() => setIndex((current) => current + 1), step.hold);
      return () => clearTimeout(timeout);
    }, [index, step.hold]);

    return <ChatActivity activity={step.activity} />;
  },
};
