//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { JsonCard } from './JsonCard.tsx';

// The card is a row slot, so it is mounted in the `Card.Root` its surface host supplies — on its own
// it has no grid to place itself in and the toggle's column cannot be seen.
const DefaultStory = ({ data }: { data: unknown }) => (
  <div className='p-4 dx-card-max-width'>
    <Card.Root>
      <Card.Header>
        <Card.Title>Notes</Card.Title>
      </Card.Header>
      <JsonCard data={data} />
    </Card.Root>
  </div>
);

const meta = {
  title: 'plugins/plugin-preview/cards/JsonCard',
  component: JsonCard,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof JsonCard>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Collapsed: the row reports the payload's size and nothing else. */
export const Default: Story = {
  args: { data: { subject: { id: '01M270MRCEV0W2BR43HT4BPEGY', name: 'Notes — Priya Nair' } } },
};

/**
 * Expanded, over a payload tall enough to show where the toggle sits: the row centres its items, so
 * the toggle has to opt out of that or it floats at the middle of the dump rather than sitting on
 * the line whose disclosure it controls.
 */
export const Expanded: Story = {
  args: {
    data: {
      subject: {
        id: '01M270MRCEV0W2BR43HT4BPEGY',
        content: { '/': 'echo:///01M270MRCEV0W2BR43HT4BPEGZ' },
        name: 'Notes — Priya Nair',
        tags: ['incident', 'retrospective', 'notes'],
        history: [
          { date: '2026-05-16T09:00:00Z', event: 'created' },
          { date: '2026-05-17T11:30:00Z', event: 'edited' },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // `getBy*`, not a `querySelector` the story can shrug off: a card that has lost its disclosure
    // control renders no dump at all, which is the failure this story exists to catch.
    const toggle = canvas.getByRole('button', { name: 'Toggle JSON' });
    toggle.click();
    // The dump itself, not merely the toggle's state: the payload has to reach the viewport.
    await expect(canvas.findByText(/Priya Nair/)).resolves.toBeTruthy();
  },
};
