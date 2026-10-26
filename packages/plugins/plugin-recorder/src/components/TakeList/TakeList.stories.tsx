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
  { id: 'take-3', name: 'take-20261026-061256', duration: 14.4, desired: 15, main: true },
  { id: 'take-2', name: 'take-20261026-061020', duration: 17.8, desired: 15 },
  { id: 'take-1', name: 'take-20261026-060432', duration: 18, desired: 15, error: 'Not saved: File is too large' },
];

const DefaultStory = () => (
  <TakeList.Root>
    {takes.map((take) => (
      <TakeList.Item
        key={take.id}
        take={take}
        actions={<Button.Root icon='ph--play--regular' iconOnly variant='ghost' label='Play' />}
      />
    ))}
  </TakeList.Root>
);

const meta = {
  title: 'plugins/plugin-recorder/components/TakeList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[28rem] p-4' })],
  parameters: { translations },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Every take is listed.
    const items = canvas.getAllByTestId('recorder.take');
    await expect(items).toHaveLength(3);
    // 2. Only the main take is marked.
    await expect(items.filter((item) => item.getAttribute('data-main') === 'true')).toHaveLength(1);
  },
};
