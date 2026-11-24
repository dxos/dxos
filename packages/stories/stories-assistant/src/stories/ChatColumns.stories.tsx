//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ChatColumns } from '../components/index.ts';
import { Scripts } from '../scripts/index.ts';
import { CalculatorSkill, createDecorators, storyParameters, submitPrompt } from '../testing/index.ts';

/**
 * A column per chat: every chat in the space is a conversation of its own, and the selected one rests at the center of
 * the strip with its prompt beneath it. Chats are added at either end and reordered by dragging. For one chat beside
 * the threads it delegates, see the ThreadColumns stories.
 */
const meta: Meta<typeof ChatColumns> = {
  title: 'stories/stories-assistant/ChatColumns',
  component: ChatColumns,
  decorators: createDecorators({
    skills: [CalculatorSkill.key],
    scriptedModels: { scenes: { hello: Scripts.hello }, select: 'hello' },
  }),
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

const COLUMN = '[data-testid="chat-plane.column"]';

/**
 * Scripted (offline), for a person to drive.
 *
 * Test:
 * 1. Send "What is 17 × 23": the chat answers in its column.
 * 2. Click the plus at the end of the strip: a second chat opens, selected, with an empty prompt of its own.
 * 3. Send "Write me a haiku": only the second chat answers.
 * 4. Click the first column: it moves to the center and its prompt takes the second chat's place.
 */
export const Default: Story = {};

/** {@link Default} driven by a play function: two chats, each answering only its own prompt. */
export const Scripted: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, 'What is 17 × 23');
    await canvas.findAllByText(/17 × 23 = 391/, {}, { timeout: 30_000 });

    // A second chat opens beside the first and takes the selection, and with it the prompt.
    await userEvent.click(await canvas.findByTestId('chat-plane.add-end'));
    await waitFor(() => expect(canvasElement.querySelectorAll(COLUMN).length).toBe(2), { timeout: 30_000 });
    await submitPrompt(canvasElement, 'Write me a haiku');
    await canvas.findAllByText(/sync like the tide/, {}, { timeout: 30_000 });

    // Each chat holds only its own conversation.
    const [first, second] = Array.from(canvasElement.querySelectorAll<HTMLElement>(COLUMN));
    await expect(first.textContent).toContain('17 × 23 = 391');
    await expect(first.textContent).not.toContain('sync like the tide');
    await expect(second.textContent).toContain('sync like the tide');
    await expect(second.textContent).not.toContain('17 × 23 = 391');
  },
};
