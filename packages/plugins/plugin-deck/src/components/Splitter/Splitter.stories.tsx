//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Icon, IconButton } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { Pane, type PaneTab } from '../Pane';
import { Splitter, type SplitterProps } from './Splitter';

const TABS: PaneTab[] = [
  { id: 'notes', icon: 'ph--note--regular', label: 'Notes' },
  { id: 'chat', icon: 'ph--chat--regular', label: 'Chat' },
  { id: 'links', icon: 'ph--link--regular', label: 'Links' },
];

// The story owns the companion state (open/close + selected tab); the Splitter owns the split extent.
// Closing keeps the companion mounted (hidden), and all tab panels stay mounted (inactive hidden), so
// switching tabs or toggling the companion preserves each panel's state.
const SplitterStory = ({ orientation }: Pick<SplitterProps, 'orientation'>) => {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState('notes');

  const main = (
    <Pane.Root>
      <Pane.Toolbar>
        <Pane.Sigil attendableId='plank-main'>
          <Icon icon='ph--circle-dashed--regular' />
        </Pane.Sigil>
        <Pane.Title attendableId='plank-main'>Main plank</Pane.Title>
        <IconButton
          iconOnly
          variant='ghost'
          icon={
            orientation === 'vertical' ? 'ph--square-split-vertical--regular' : 'ph--square-split-horizontal--regular'
          }
          label='Toggle companion'
          onClick={() => setOpen((value) => !value)}
        />
      </Pane.Toolbar>
      <Pane.Content classNames='grid place-items-center text-description'>
        <span>Main content surface</span>
      </Pane.Content>
    </Pane.Root>
  );

  const companion = (
    <Pane.Root>
      <Pane.Toolbar>
        <Pane.Tabs tabs={TABS} value={tab} onValueChange={setTab} attendableId='plank-main' />
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--x--regular'
          label='Close companion'
          onClick={() => setOpen(false)}
        />
      </Pane.Toolbar>
      {/* All panels stay mounted; the inactive ones are hidden so switching tabs preserves their state. */}
      {TABS.map((entry) => (
        <Pane.Content
          key={entry.id}
          classNames={mx('grid place-items-center text-description', tab !== entry.id && 'hidden')}
        >
          <span className='flex items-center gap-1'>
            <Icon icon={entry.icon} />
            {entry.label}
          </span>
        </Pane.Content>
      ))}
    </Pane.Root>
  );

  return (
    <Splitter classNames='bg-deck-surface' orientation={orientation} main={main} companion={companion} open={open} />
  );
};

const meta: Meta<typeof SplitterStory> = {
  title: 'plugins/plugin-deck/components/Splitter',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withAttention('plank-main')],
  render: (args) => <SplitterStory {...args} />,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    orientation: { control: 'radio', options: ['horizontal', 'vertical'] },
  },
  args: {
    orientation: 'horizontal',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
};
