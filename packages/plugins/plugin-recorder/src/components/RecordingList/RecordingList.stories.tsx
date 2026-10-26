//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type RecordingItem, RecordingList } from './RecordingList.tsx';

const takes: RecordingItem[] = [
  { id: 'take-3', title: 'take-20261026-061256', duration: 14.4, desired: 15, main: true },
  { id: 'take-2', title: 'take-20261026-061020', duration: 17.8, desired: 15 },
  {
    id: 'take-1',
    title: 'take-20261026-060432',
    description: 'Not saved: File is too large',
    duration: 18,
    desired: 15,
    error: true,
  },
];

const slides: RecordingItem[] = [
  { id: 'a', index: 0, title: 'The Silo Problem', description: '3 takes', duration: 14.4, desired: 15 },
  { id: 'b', index: 1, title: 'Monolithic Agents', description: '1 take', duration: 13.2, desired: 12 },
  { id: 'c', index: 2, title: 'ECHO Graph Database', description: 'no takes', desired: 20 },
];

const DefaultStory = ({ items }: { items: RecordingItem[] }) => {
  const [value, setValue] = useState(items[0]?.id);
  return <RecordingList label='Takes' items={items} value={value} onValueChange={setValue} />;
};

const meta = {
  title: 'plugins/plugin-recorder/components/RecordingList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[28rem]' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Takes: Story = { args: { items: takes } };

export const Slides: Story = { args: { items: slides } };

export const Test: Story = {
  args: { items: slides },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const rows = canvas.getAllByTestId('recorder.item');
    // 1. Every slide is listed, recorded or not.
    await expect(rows).toHaveLength(3);
    // 2. A slide over its desired length is flagged; a slide with no take is marked unrecorded.
    await expect(rows[1].querySelector('[data-over="true"]')).not.toBeNull();
    await expect(rows[2].getAttribute('data-recorded')).toBeNull();
    // 3. The arrow keys move the selection, not just the highlight.
    await userEvent.click(rows[0]);
    await userEvent.keyboard('{ArrowDown}');
    await expect(rows[1]).toHaveAttribute('aria-selected', 'true');
  },
};
