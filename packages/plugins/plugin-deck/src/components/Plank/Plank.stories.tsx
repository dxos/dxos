//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Icon, IconButton } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Plank, type PlankTab } from './Plank';

const TABS: PlankTab[] = [
  { id: 'notes', icon: 'ph--note--regular', label: 'Notes' },
  { id: 'chat', icon: 'ph--chat--regular', label: 'Chat' },
  { id: 'links', icon: 'ph--link--regular', label: 'Links' },
];

// A presentational preview of the solo split: a main Plank beside a companion Plank (tabs + close).
const SplitStory = () => {
  const [tab, setTab] = useState('notes');
  return (
    <div className='w-full grid grid-cols-2 px-3 gap-3 bg-deck-surface'>
      <Plank.Root>
        <Plank.Toolbar>
          <Plank.Sigil attendableId='plank-main'>
            <Icon icon='ph--circle-dashed--regular' />
          </Plank.Sigil>
          <Plank.Title attendableId='plank-main'>Main plank</Plank.Title>
          <IconButton iconOnly variant='ghost' icon='ph--arrows-out--regular' label='Fullscreen' />
          <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Close' />
        </Plank.Toolbar>
        <Plank.Content classNames='grid place-items-center text-description'>
          <span>Main content surface</span>
        </Plank.Content>
      </Plank.Root>

      <Plank.Root>
        <Plank.Toolbar>
          <Plank.Tabs tabs={TABS} value={tab} onValueChange={setTab} attendableId='plank-main' />
          <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Close companion' />
        </Plank.Toolbar>
        <Plank.Content classNames='grid place-items-center text-description'>
          <span className='flex items-center gap-1'>
            <Icon icon={TABS.find((t) => t.id === tab)!.icon} />
            {tab}
          </span>
        </Plank.Content>
      </Plank.Root>
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-deck/components/Plank',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withAttention('plank-main')],
  render: () => <SplitStory />,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
