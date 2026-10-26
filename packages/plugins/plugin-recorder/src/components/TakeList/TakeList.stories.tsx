//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type TakeItem, TakeList } from './TakeList.tsx';

const takes: TakeItem[] = [
  {
    id: 'take-2',
    name: 'take-20261026-021256',
    duration: 63.4,
    cover: true,
    slides: [
      { id: 'a', title: 'The Silo Problem', seconds: 14.7, duration: 15 },
      { id: 'b', title: 'Monolithic Agents', seconds: 14.4, duration: 12 },
      { id: 'c', title: 'ECHO Graph Database', seconds: 20.2, duration: 20 },
      { id: 'd', title: 'Open and Extensible', seconds: 14.1 },
    ],
  },
  {
    id: 'take-1',
    name: 'take-20261026-020432',
    duration: 71,
    error: 'Not saved: File is too large',
    slides: [{ id: 'a', title: 'The Silo Problem', seconds: 18, duration: 15 }],
  },
];

const DefaultStory = () => (
  <TakeList.Root>
    {takes.map((take) => (
      <TakeList.Item
        key={take.id}
        take={take}
        actions={
          take.error ? (
            <Button.Root icon='ph--download-simple--regular' iconOnly variant='ghost' label='Save as a file' />
          ) : undefined
        }
      />
    ))}
  </TakeList.Root>
);

const meta = {
  title: 'plugins/plugin-recorder/components/TakeList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[32rem] p-4' })],
  parameters: { translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Both takes are listed.
    await expect(canvas.getAllByTestId('recorder.take')).toHaveLength(2);
    // 2. A slide that ran past its desired length is flagged; one within it is not.
    const rows = canvasElement.querySelectorAll('tr[data-over]');
    await expect(rows[1].getAttribute('data-over')).toBe('true');
    await expect(rows[0].getAttribute('data-over')).toBe('false');
  },
};
