//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input, ScrollArea, Toolbar } from '../../components';
import { withLayout, withTheme } from '../../testing';

import { Container } from './Container';

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
    <Container.Main toolbar statusbar>
      <Toolbar.Root classNames='gap-2'>
        <Toolbar.IconButton icon='ph--plus--regular' variant='primary' label='Add' />
        <Input.Root>
          <Input.TextInput placeholder='Search' />
        </Input.Root>
        <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
      </Toolbar.Root>

      <List />

      <Toolbar.Root classNames='justify-between'>
        <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Add' size={4} />
        <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' size={4} />
      </Toolbar.Root>
    </Container.Main>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Container',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
