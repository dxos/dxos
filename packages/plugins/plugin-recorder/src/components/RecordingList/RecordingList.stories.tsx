//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type RecordingItem, RecordingList } from './RecordingList.tsx';

const takes: RecordingItem[] = [
  { id: 'take-3', title: 'Oct 26, 2026, 6:12:56 AM', duration: 14.4, desired: 15, main: true },
  { id: 'take-2', title: 'Oct 26, 2026, 6:10:20 AM', duration: 17.8, desired: 15 },
  {
    id: 'take-1',
    title: 'Oct 26, 2026, 6:04:32 AM',
    description: 'Not saved',
    duration: 18,
    desired: 15,
    error: true,
  },
];

const slides: RecordingItem[] = [
  { id: 'a', title: 'The Silo Problem', description: '3 takes', duration: 14.4, desired: 15, main: true },
  { id: 'b', title: 'Monolithic Agents', description: '1 take', duration: 13.2, desired: 12, main: true },
  { id: 'c', title: 'ECHO Graph Database', desired: 20 },
];

type StoryProps = {
  items: RecordingItem[];
  onToggle?: (item: RecordingItem) => void;
  onMain?: (item: RecordingItem) => void;
};

const DefaultStory = ({ items, onToggle, onMain }: StoryProps) => {
  const [value, setValue] = useState(items[0]?.id);
  return (
    <RecordingList
      label='Recordings'
      items={items}
      value={value}
      onValueChange={setValue}
      onMain={onMain}
      onToggle={onToggle}
      actions={(item) => [
        {
          id: 'play',
          icon: 'ph--play--regular',
          label: 'Play',
          disabled: item.duration === undefined,
          onClick: () => {},
        },
      ]}
    />
  );
};

const meta = {
  title: 'plugins/plugin-recorder/components/RecordingList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[36rem]' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Takes: Story = { args: { items: takes, onMain: () => {} } };

export const Slides: Story = { args: { items: slides } };

export const Test: Story = {
  args: { items: slides, onToggle: fn() },
  play: async ({ canvasElement, args }) => {
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
    // 4. Space plays (or stops) the current row.
    await userEvent.keyboard(' ');
    await expect(args.onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    // 5. A press on a row's button selects its row.
    await userEvent.click(within(rows[0]).getByTestId('recorder.item.play'));
    await expect(rows[0]).toHaveAttribute('aria-selected', 'true');
  },
};
