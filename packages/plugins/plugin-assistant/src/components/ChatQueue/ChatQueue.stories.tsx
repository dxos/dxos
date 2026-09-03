//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '#translations';

import { ChatQueue } from './ChatQueue.tsx';

const makeQueued = (text: string, index: number) =>
  Message.make({
    created: new Date(Date.UTC(2026, 8, 1, 12, index)).toISOString(),
    sender: { role: 'user' },
    blocks: [{ _tag: 'text', text }],
  });

type StoryArgs = {
  prompts?: string[];
  cancelable?: boolean;
};

const DefaultStory = ({ prompts = [], cancelable = true }: StoryArgs) => {
  const [queued, setQueued] = useState(() => prompts.map(makeQueued));
  const handleCancel = useCallback((message: Message.Message) => {
    setQueued((current) => current.filter((entry) => entry.id !== message.id));
  }, []);

  return <ChatQueue queued={queued} onCancel={cancelable ? handleCancel : undefined} classNames='items-end' />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatQueue',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'flex flex-col justify-end w-[30rem] p-4' })],
  parameters: { translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    prompts: ['Summarize the meeting notes', 'Then draft a follow-up email to the team'],
  },
};

/** Nothing queued renders nothing at all, so the composer keeps its own spacing. */
export const Empty: Story = {
  args: { prompts: [] },
};

export const Long: Story = {
  args: {
    prompts: [
      'Summarize the meeting notes',
      'Then draft a follow-up email to the team about the decisions and the owners of each action item',
      'Finally, schedule the review',
    ],
  },
};

/** Read-only: no cancel affordance when the caller supplies no handler. */
export const ReadOnly: Story = {
  args: {
    prompts: ['Waiting on the agent'],
    cancelable: false,
  },
};

export const TestCancel: Story = {
  args: {
    prompts: ['Keep this one', 'Cancel this one'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = await canvas.findAllByTestId('assistant.queued-message');
    await expect(items).toHaveLength(2);

    const [, second] = items;
    await userEvent.click(within(second).getByTestId('assistant.queued-message.cancel'));

    const remaining = await canvas.findAllByTestId('assistant.queued-message');
    await expect(remaining).toHaveLength(1);
    await expect(remaining[0]).toHaveTextContent('Keep this one');
  },
};
