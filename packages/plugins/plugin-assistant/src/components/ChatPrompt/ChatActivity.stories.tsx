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

import { ChatActivityView, type ChatActivityViewProps } from './ChatActivity';

const meta = {
  title: 'plugins/plugin-assistant/components/ChatActivity',
  component: ChatActivityView,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
  args: {
    classNames: 'px-3 rounded-sm bg-group-surface',
  },
} satisfies Meta<typeof ChatActivityView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing in flight: the line renders nothing rather than empty chrome above the composer. */
export const Empty: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('assistant.chat-activity')).toBeNull();
  },
};

export const Preparing: Story = {
  args: { activity: { phase: 'preparing' } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity')).toHaveTextContent('Preparing request');
  },
};

/** `detail` carries the server count, as `connectMcpServers` emits it. */
export const ConnectingMcp: Story = {
  args: { activity: { phase: 'connecting-mcp', detail: '3' } },
};

/** The first attempt is just the request, so no attempt count is shown. */
export const ContactingProvider: Story = {
  args: { activity: { phase: 'contacting-provider', attempt: 1 } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('assistant.chat-activity')).toHaveTextContent('Contacting inference provider');
    await expect(canvas.queryByTestId('assistant.chat-activity.attempt')).toBeNull();
  },
};

/** A re-issued request: the reader is told the wait is a retry rather than a stall. */
export const Retrying: Story = {
  args: { activity: { phase: 'contacting-provider', attempt: 3 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity.attempt')).toHaveTextContent('attempt 3');
  },
};

/**
 * The wait as the reader experiences it: phases advancing in the order a turn enters them, the
 * provider request re-issued twice, then the line vanishing as the first token arrives.
 *
 * A story rather than a set of args because the sequence is the behaviour under test — the phases
 * are only meaningful in order, and the clear-on-stream is the half a static render cannot show.
 */
export const Sequence: StoryObj<typeof meta> = {
  render: ({ classNames }) => <ActivitySequence classNames={classNames} />,
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
  // The first streamed block clears the line: from here the reply is the progress report.
  { hold: 500, reply: 'The' },
  { hold: 400, reply: 'The retry' },
  { hold: 400, reply: 'The retry is now' },
  { hold: 400, reply: 'The retry is now visible' },
  { hold: 2000, reply: 'The retry is now visible instead of a dead pause.' },
];

const ActivitySequence = ({ classNames }: Pick<ChatActivityViewProps, 'classNames'>) => {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  useEffect(() => {
    if (index >= STEPS.length - 1) {
      return;
    }

    const timeout = setTimeout(() => setIndex((current) => current + 1), step.hold);
    return () => clearTimeout(timeout);
  }, [index, step.hold]);

  // Thread above, footer between, composer below — the arrangement `ChatArticle` mounts, so the
  // line is seen where it actually appears rather than centred on its own.
  return (
    <div className='flex flex-col w-[36rem] gap-1'>
      <div className='flex flex-col justify-end min-h-24 p-3 text-sm'>
        <p>Why was there a long pause before the reply?</p>
        {step.reply && <p className='pt-2 text-description'>{step.reply}</p>}
      </div>
      <ChatActivityView classNames={classNames} activity={step.activity} />
      <div className='px-3 py-2 border border-separator rounded-sm text-sm text-subdued'>Ask a question…</div>
    </div>
  );
};
