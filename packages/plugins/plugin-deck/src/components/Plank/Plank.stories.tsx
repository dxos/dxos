//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Icon, IconButton } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Companion, type CompanionTab } from '../Companion';
import { Plank } from './Plank';

const TABS: CompanionTab[] = [
  { id: 'notes', icon: 'ph--note--regular', label: 'Notes' },
  { id: 'chat', icon: 'ph--chat--regular', label: 'Chat' },
  { id: 'links', icon: 'ph--link--regular', label: 'Links' },
];

// A presentational preview of the solo split: a main Plank beside a tabbed Companion pane.
const SplitStory = () => {
  const [tab, setTab] = useState('notes');
  return (
    <div className='w-full grid grid-cols-2 px-3 gap-3 bg-deck-surface'>
      <Plank.Root classNames='flex-1 border-e border-separator'>
        <Plank.Toolbar>
          <IconButton iconOnly variant='ghost' icon='ph--circle-dashed--regular' label='Menu' />
          <Plank.Title attendableId='plank-main'>Main plank</Plank.Title>
          <IconButton iconOnly variant='ghost' icon='ph--arrows-out--regular' label='Fullscreen' />
          <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Close' />
        </Plank.Toolbar>
        <Plank.Content classNames='grid place-items-center text-description'>
          <span>Main content surface</span>
        </Plank.Content>
      </Plank.Root>
      <Companion.Root classNames='w-80'>
        <Companion.Tabs tabs={TABS} value={tab} onValueChange={setTab} />
        <Companion.Content classNames='grid place-items-center text-description'>
          <span className='flex items-center gap-1'>
            <Icon icon={TABS.find((t) => t.id === tab)!.icon} />
            {tab}
          </span>
        </Companion.Content>
      </Companion.Root>
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-deck/components/Plank',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  render: () => <SplitStory />,
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
