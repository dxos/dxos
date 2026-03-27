//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input, ScrollArea, Toolbar } from '../../components';
import { withLayout, withTheme } from '../../testing';

import { Panel } from './Panel';

const List = () => {
  return (
    <ScrollArea.Root margin role='list'>
      <ScrollArea.Viewport>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} role='listitem' className='p-1 hover:bg-hover-surface'>
            Item {i}
          </div>
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const DefaultStory = () => {
  return (
    <Panel.Root className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='gap-2'>
          <Toolbar.IconButton icon='ph--plus--regular' variant='primary' label='Add' />
          <Input.Root>
            <Input.TextInput placeholder='Search' />
          </Input.Root>
          <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <List />
      </Panel.Content>

      <Panel.Statusbar asChild>
        <Toolbar.Root classNames='justify-between'>
          <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Add' />
          <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' />
        </Toolbar.Root>
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Panel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
