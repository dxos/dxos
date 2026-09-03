//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ChatStatusStackView } from './ChatStatusStack';

const STARTED_AT = new Date('2026-06-04T14:00:00.000Z').getTime();

const meta = {
  title: 'plugins/plugin-assistant/components/ChatStatusStack',
  component: ChatStatusStackView,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
  args: {
    pillClassNames: 'px-3 rounded-sm bg-group-surface',
  },
} satisfies Meta<typeof ChatStatusStackView>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Both rows at once, which is the arrangement worth looking at: the turn in flight is still setting
 * up while the pill reports what the previous turns cost.
 */
export const Default: Story = {
  args: {
    activity: { phase: 'building-toolkit' },
    requestTiming: { startedAt: STARTED_AT, endedAt: STARTED_AT + 55_000 },
    lastOutputTokens: 132,
    sessionTotalTokens: 19_359_900,
    alarm: { wakeAt: new Date('2026-06-04T20:05:00.000Z').getTime() },
  },
};

/**
 * The activity line is on top of the counters pill.
 *
 * Asserted on document order rather than geometry: the stack is a plain column, so a swapped
 * composition shows up as a reversed `compareDocumentPosition` without depending on layout.
 */
export const TestOrder: Story = {
  args: {
    activity: { phase: 'building-toolkit' },
    requestTiming: { startedAt: STARTED_AT, endedAt: STARTED_AT + 55_000 },
    sessionTotalTokens: 19_359_900,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const activity = await canvas.findByTestId('assistant.chat-activity', {}, { timeout: 10_000 });
    const pill = await canvas.findByText(/19,359.9k/, {}, { timeout: 10_000 });
    // DOCUMENT_POSITION_FOLLOWING (4): the pill comes after the activity line.
    await expect(activity.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  },
};

/** Only one row has anything to say: the other renders nothing rather than reserving space. */
export const ActivityOnly: Story = {
  args: {
    activity: { phase: 'connecting-mcp', detail: '3' },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('assistant.chat-activity')).toBeInTheDocument();
    await expect(canvasElement.textContent ?? '').not.toContain('Σ');
  },
};
