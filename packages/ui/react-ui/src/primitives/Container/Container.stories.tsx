//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ScrollArea } from '../../components';
import { withLayout, withTheme } from '../../testing';

import { Container, type ContainerRootProps } from './Container';

const DefaultStory = (props: ContainerRootProps) => {
  return (
    <Container.Column className='h-full overflow-hidden'>
      <Container.Segment>
        <h1 className='p-1 bg-yellow-500 text-black'>Channel</h1>
      </Container.Segment>

      <Container.Segment>
        <div className='p-1 bg-blue-500 text-black'>Section 1</div>
      </Container.Segment>

      {/* TODO(burdon): Detect grid. */}
      <ScrollArea.Root className='col-span-full' margin thin>
        <ScrollArea.Viewport>
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className='p-1 bg-green-500/50 text-black'>
              Section 2
            </div>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <Container.Segment>
        <div className='p-1 bg-orange-500 text-black'>Section 1</div>
      </Container.Segment>
    </Container.Column>
  );
};

const meta: Meta<typeof Container.Root> = {
  title: 'ui/react-ui-core/primitives/Container',
  component: Container.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
