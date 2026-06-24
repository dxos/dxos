//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Icon, IconButton } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Plank, type PlankTab } from './Plank';

const TABS: PlankTab[] = [
  { id: 'notes', icon: 'ph--note--regular', label: 'Notes' },
  { id: 'chat', icon: 'ph--chat--regular', label: 'Chat' },
  { id: 'links', icon: 'ph--link--regular', label: 'Links' },
];

// A self-contained main Plank that is its own attendable region (focusing it sets attention, which the
// sigil and title reflect via the accent color).
const MainPlank = ({ id, label }: { id: string; label: string }) => {
  const attentionAttrs = useAttentionAttributes(id);
  return (
    <Plank.Root tabIndex={0} classNames='flex-1' {...attentionAttrs}>
      <Plank.Toolbar>
        <Plank.Sigil attendableId={id}>
          <Icon icon='ph--circle-dashed--regular' />
        </Plank.Sigil>
        <Plank.Title attendableId={id}>{label}</Plank.Title>
        <IconButton iconOnly variant='ghost' icon='ph--arrows-out--regular' label='Fullscreen' />
        <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Close' />
      </Plank.Toolbar>
      <Plank.Content classNames='grid place-items-center text-description'>
        <span>{label} content</span>
      </Plank.Content>
    </Plank.Root>
  );
};

// A presentational preview of the solo split: a main Plank beside a companion Plank (tabs + close).
const SplitStory = () => {
  const [tab, setTab] = useState('notes');
  return (
    <div className='w-full grid grid-cols-2 px-3 gap-3 bg-deck-surface'>
      <MainPlank id='plank-main' label='Main plank' />
      <Plank.Root>
        <Plank.Toolbar>
          <Plank.Tabs tabs={TABS} value={tab} onValueChange={setTab} attendableId='plank-main' related />
          <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Close companion' />
        </Plank.Toolbar>
        <Plank.Content classNames='grid place-items-center text-description'>
          <span className='flex items-center gap-1'>
            <Icon icon={TABS.find((entry) => entry.id === tab)!.icon} />
            {tab}
          </span>
        </Plank.Content>
      </Plank.Root>
    </div>
  );
};

// Two main planks side by side; click either to move attention — only the attended plank's sigil and
// title take the accent color.
const TwoPlanksStory = () => (
  <div className='w-full flex h-full px-3 gap-3 bg-deck-surface'>
    <MainPlank id='plank-a' label='Plank A' />
    <MainPlank id='plank-b' label='Plank B' />
  </div>
);

const meta: Meta = {
  title: 'plugins/plugin-deck/components/Plank',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <SplitStory />,
  decorators: [withAttention('plank-main')],
};

export const Attention: Story = {
  render: () => <TwoPlanksStory />,
  decorators: [withAttention('plank-a')],
};
