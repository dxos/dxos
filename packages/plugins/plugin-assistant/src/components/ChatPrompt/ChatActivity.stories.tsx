//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatActivityView } from './ChatActivity';

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

export const ConnectingMcp: Story = {
  args: { activity: { phase: 'connecting-mcp' } },
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
