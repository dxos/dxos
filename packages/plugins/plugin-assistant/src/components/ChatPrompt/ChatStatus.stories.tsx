//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatStatusView, formatWakeAt } from './ChatStatus';

// Fixed so the rendered clock time is deterministic to assert against.
const WAKE_AT = new Date('2026-06-04T14:20:00.000Z').getTime();
const STARTED_AT = new Date('2026-06-04T14:00:00.000Z').getTime();

const meta = {
  title: 'plugins/plugin-assistant/components/ChatStatus',
  component: ChatStatusView,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
  args: {
    classNames: 'px-3 rounded-sm bg-group-surface',
  },
} satisfies Meta<typeof ChatStatusView>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Nothing to report: the pill renders nothing rather than an empty chrome. */
export const Empty: Story = {
  args: {},
};

export const Tokens: Story = {
  args: {
    requestTiming: { startedAt: STARTED_AT, endedAt: STARTED_AT + 4_200 },
    lastOutputTokens: 132,
    sessionTotalTokens: 68_800,
  },
};

/** A pending alarm with no turn to report on — the pill exists for the alarm alone. */
export const AlarmOnly: Story = {
  args: {
    alarm: { wakeAt: WAKE_AT, message: 'Check the build' },
  },
};

export const AlarmWithTokens: Story = {
  args: {
    requestTiming: { startedAt: STARTED_AT, endedAt: STARTED_AT + 4_200 },
    lastOutputTokens: 132,
    sessionTotalTokens: 68_800,
    alarm: { wakeAt: WAKE_AT, message: 'Check the build' },
  },
};

/** Mid-turn: the elapsed value advances and the icon animates. */
export const Running: Story = {
  args: {
    icon: true,
    requestTiming: { startedAt: Date.now(), endedAt: null },
    alarm: { wakeAt: WAKE_AT },
  },
};

/**
 * The alarm slot, which is the only part of the pill sourced from feed state rather than from the
 * turn — so a regression in it would otherwise be invisible until someone set an alarm by hand.
 */
export const TestAlarm: Story = {
  args: {
    lastOutputTokens: 132,
    sessionTotalTokens: 68_800,
    alarm: { wakeAt: WAKE_AT, message: 'Check the build' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alarm = await canvas.findByTestId('assistant.chat-status.alarm', {}, { timeout: 10_000 });
    // The wake time as a clock, in the viewer's locale — the same helper the component renders with.
    await expect(alarm).toHaveTextContent(formatWakeAt(WAKE_AT));
    // The reminder is the hover text, so a long one does not stretch the pill.
    await expect(alarm).toHaveAttribute('title', 'Check the build');
    // Tokens keep their slots beside it.
    await expect(canvasElement.textContent ?? '').toContain('68.8k');
  },
};

/** Nothing pending: no alarm slot, rather than a slot showing a stale time. */
export const TestNoAlarm: Story = {
  args: {
    lastOutputTokens: 132,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('assistant.chat-status.alarm')).toBeNull();
  },
};
