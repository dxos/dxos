//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input, ScrollArea, Toolbar } from '../../components';
import { withLayout, withTheme } from '../../testing';

import { Container } from './Container';

const MainStory = () => {
  return (
    <Container.Main toolbar statusbar>
      <Toolbar.Root classNames='gap-2'>
        <Toolbar.IconButton icon='ph--plus--regular' variant='primary' label='Add' />
        <Input.Root>
          <Input.TextInput placeholder='Search' />
        </Input.Root>
        <Toolbar.IconButton icon='ph--dots-three-vertical--regular' iconOnly label='Menu' />
      </Toolbar.Root>

      <ScrollArea.Root thin orientation='vertical'>
        <ScrollArea.Viewport classNames='px-2 py-1 gap-1'>
          {Array.from({ length: 100 }).map((_, index) => (
            <div key={index} role='listitem' className='px-2 py-1 border border-separator'>
              {index}
            </div>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <Toolbar.Root classNames='justify-between'>
        <Toolbar.IconButton variant='ghost' icon='ph--house--regular' iconOnly label='Add' size={4} />
        <Toolbar.IconButton variant='ghost' icon='ph--alarm--regular' iconOnly label='Status' size={4} />
      </Toolbar.Root>
    </Container.Main>
  );
};

const ColumnStory = () => {
  return (
    <Container.Column className='h-full overflow-hidden' gutter='sm'>
      <Container.Segment>
        <h1 className='p-1 bg-yellow-500 text-black'>Header</h1>
      </Container.Segment>

      <Container.Segment>
        <div className='p-1 bg-blue-500 text-black'>Section</div>
      </Container.Segment>

      <ScrollArea.Root className='col-span-full' margin>
        <ScrollArea.Viewport>
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className='p-1 bg-green-500/50 text-black'>
              Item {i}
            </div>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <Container.Segment>
        <div className='p-1 bg-orange-500 text-black'>Footer</div>
      </Container.Segment>
    </Container.Column>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Container',
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Main: Story = {
  render: MainStory,
};

export const Column: Story = {
  render: ColumnStory,
};
