//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { IconButton } from '@dxos/react-ui';
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
        action={<IconButton iconOnly variant='ghost' icon='ph--copy--regular' label='Copy' />}
      />
      <StatCard.Row label='Used heap' value='42.1' unit='MB' />
      <StatCard.Row label='Allocated heap' value='96.0' unit='MB' />
      <StatCard.Row label='Objects' value='1,284' />
      <StatCard.Row icon='ph--warning--regular' iconClassNames='text-error-text' label='Used' value='44%' warning />
      <StatCard.Row
        label='A row whose label is far too long to fit and therefore truncates'
        tooltip='A row whose label is far too long to fit and therefore truncates'
        value='1'
        action={<IconButton iconOnly variant='ghost' icon='ph--trash--regular' label='Clear' />}
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
