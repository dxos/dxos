//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Button } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { StatCard } from './StatCard.tsx';

const DefaultStory = () => {
  const [open, setOpen] = useState(false);
  return (
    <StatCard.Root>
      <StatCard.Header
        icon='ph--cpu--regular'
        title='Memory'
        info='3 rows'
        action={<Button iconOnly variant='ghost' icon='ph--copy--regular' label='Copy' />}
      />
      <StatCard.Row label='Used heap' value='42.1' unit='MB' />
      <StatCard.Row label='Allocated heap' value='96.0' unit='MB' />
      <StatCard.Row label='Objects' value='1,284' />
      <StatCard.Row icon='ph--warning--regular' iconClassNames='text-error-text' label='Used' value='44%' warning />
      <StatCard.Row
        label='A row whose label is far too long to fit and therefore truncates'
        tooltip='A row whose label is far too long to fit and therefore truncates'
        value='1'
        action={<Button iconOnly variant='ghost' icon='ph--trash--regular' label='Clear' />}
      />
      <StatCard.Row label='11:26:50.351 · sync.start · BXYZ1' open={open} onToggle={setOpen} />
      {open && (
        <StatCard.Content>
          <pre className='text-xs'>{JSON.stringify({ type: 'sync.start', space: 'BXYZ1' }, null, 2)}</pre>
        </StatCard.Content>
      )}
    </StatCard.Root>
  );
};

const meta = {
  title: 'devtools/devtools/StatCard',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A header with a status and a menu, as the EDGE card has. */
const MenuStory = () => (
  <StatCard.Root>
    <StatCard.Header
      icon='ph--cloud--regular'
      title='EDGE'
      info='healthy'
      menu={[
        { label: 'Refresh', icon: 'ph--arrow-clockwise--regular', onClick: () => {} },
        { label: 'Copy raw', icon: 'ph--copy--regular', onClick: () => {} },
      ]}
    />
    <StatCard.Row label='Websocket' value='connected' />
    <StatCard.Row label='RTT' value='85' unit='ms' />
    <StatCard.Row
      label='Cache'
      value='12'
      action={<Button iconOnly variant='ghost' icon='ph--trash--regular' label='Clear' />}
    />
  </StatCard.Root>
);

/** The menu sits in the trailing rail, level with the units, and the status ends just before it. */
export const TestHeaderMenu: Story = {
  render: () => <MenuStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'EDGE' }).getBoundingClientRect();
    const rowAction = canvas.getByRole('button', { name: 'Clear' }).getBoundingClientRect();
    const info = canvas.getByText('healthy').getBoundingClientRect();
    // The trigger is in the trailing rail, level with a row's action (the header's rail cell insets it by a pixel or two).
    await expect(Math.abs(trigger.right - rowAction.right)).toBeLessThanOrEqual(2);
    // The status is pushed to the end of the middle column, against the rail.
    await expect(trigger.left - info.right).toBeLessThan(16);

    // The menu opens from the rail.
    await userEvent.click(canvas.getByRole('button', { name: 'EDGE' }));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('menuitem', { name: 'Refresh' }),
    ).toBeVisible();
  },
};
