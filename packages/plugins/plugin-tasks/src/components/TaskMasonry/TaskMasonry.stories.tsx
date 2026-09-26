//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TaskMasonry } from './TaskMasonry.tsx';

type Item = { id: string; title: string; lines: number };

const ITEMS: Item[] = [
  { id: 'a', title: 'Cupping Sheet', lines: 1 },
  { id: 'b', title: 'Roast Log — Batch 14', lines: 4 },
  { id: 'c', title: 'Supplier Notes', lines: 2 },
  { id: 'd', title: 'diagram.png', lines: 6 },
  { id: 'e', title: 'cupping-notes.txt', lines: 1 },
];

const ItemCard = ({ data }: { data: Item }) => (
  <Card.Root fullWidth data-testid='taskMasonry.tile'>
    <Card.Header>
      <Card.Title>{data.title}</Card.Title>
    </Card.Header>
    {Array.from({ length: data.lines }, (_, line) => (
      <Card.Text key={line} variant='description'>
        Line {line + 1}
      </Card.Text>
    ))}
  </Card.Root>
);

const meta = {
  title: 'plugins/plugin-tasks/components/TaskMasonry',
  render: () => (
    <div className='p-4'>
      <TaskMasonry items={ITEMS} getId={(item) => item.id} Tile={ItemCard} />
    </div>
  ),
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Cards of uneven height packed into start-aligned columns at three quarters of a standard card. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findAllByTestId('taskMasonry.tile')).resolves.toHaveLength(ITEMS.length);
  },
};
