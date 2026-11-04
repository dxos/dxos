//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations.ts';
import { ThreadCard } from './ThreadCard.tsx';

const started = new Date(Date.now() - 4 * 60_000).toISOString();

const lines = [
  { role: 'user', name: 'Rich', text: 'Collect the beta sign-ups from the form.' },
  { role: 'tool', text: '→ read_document' },
  { role: 'assistant', text: 'The form has about 300 responses.' },
  { role: 'tool', text: '→ search' },
  { role: 'assistant', text: 'I have read 120 responses and removed 8 duplicates.' },
];

const meta = {
  title: 'ui/react-ui-assistant/components/ThreadCard',
  component: ThreadCard,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[40rem] p-4' }), withTheme()],
  parameters: { layout: 'centered', translations },
} satisfies Meta<typeof ThreadCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    lane: { id: 'signups', hue: 'fuchsia', title: 'Collect beta sign-ups', status: 'running', started },
    lines,
  },
};

export const Waiting: Story = {
  args: {
    lane: {
      id: 'freeze',
      hue: 'amber',
      title: 'Check the API freeze',
      status: 'waiting',
      waitingOn: { hue: 'sky', title: 'Draft the announcement' },
      started,
    },
    lines,
  },
};

export const TestExpand: Story = {
  args: {
    lane: { id: 'pricing', hue: 'emerald', title: 'Review the pricing page', status: 'done', started },
    lines: Array.from({ length: 30 }, (_, index) => ({ role: 'assistant', text: `Step ${index + 1}.` })),
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');
    await expect(button.getAttribute('aria-expanded')).toBe('false');
    const collapsed = canvasElement.querySelector<HTMLElement>('[data-testid="chat.lane-card"]')!.offsetHeight;
    await userEvent.click(button);
    await expect(button.getAttribute('aria-expanded')).toBe('true');
    await expect(
      canvasElement.querySelector<HTMLElement>('[data-testid="chat.lane-card"]')!.offsetHeight,
    ).toBeGreaterThan(collapsed);
  },
};
