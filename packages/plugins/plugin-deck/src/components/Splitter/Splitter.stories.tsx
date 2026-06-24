//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Icon, IconButton } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Plank, type PlankTab } from '../Plank';
import { Splitter } from './Splitter';

const TABS: PlankTab[] = [
  { id: 'notes', icon: 'ph--note--regular', label: 'Notes' },
  { id: 'chat', icon: 'ph--chat--regular', label: 'Chat' },
  { id: 'links', icon: 'ph--link--regular', label: 'Links' },
];

// The story owns the companion state (open/close + selected tab); the Splitter owns the split extent.
const SplitterStory = () => {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState('notes');

  const main = (
    <Plank.Root>
      <Plank.Toolbar>
        <Plank.Sigil attendableId='plank-main'>
          <Icon icon='ph--circle-dashed--regular' />
        </Plank.Sigil>
        <Plank.Title attendableId='plank-main'>Main plank</Plank.Title>
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--sidebar-simple--regular'
          label='Toggle companion'
          onClick={() => setOpen((value) => !value)}
        />
      </Plank.Toolbar>
      <Plank.Content classNames='grid place-items-center text-description'>
        <span>Main content surface</span>
      </Plank.Content>
    </Plank.Root>
  );

  const companion = (
    <Plank.Root>
      <Plank.Toolbar>
        <Plank.Tabs tabs={TABS} value={tab} onValueChange={setTab} attendableId='plank-main' />
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--x--regular'
          label='Close companion'
          onClick={() => setOpen(false)}
        />
      </Plank.Toolbar>
      <Plank.Content classNames='grid place-items-center text-description'>
        <span className='flex items-center gap-1'>
          <Icon icon={TABS.find((entry) => entry.id === tab)!.icon} />
          {tab}
        </span>
      </Plank.Content>
    </Plank.Root>
  );

  return <Splitter classNames='bg-deck-surface' main={main} companion={open ? companion : undefined} />;
};

const meta: Meta = {
  title: 'plugins/plugin-deck/components/Splitter',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withAttention('plank-main')],
  render: () => <SplitterStory />,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
