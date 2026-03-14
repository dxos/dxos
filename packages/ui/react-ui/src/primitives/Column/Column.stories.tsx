//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input, ScrollArea } from '../../components';
import { withLayout, withTheme } from '../../testing';
import { Flex } from '../Flex';

import { Column } from './Column';

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
    <Column.Root className='h-full overflow-hidden' gutter='md'>
      <Column.Segment asChild>
        <h1 className='p-1 bg-blue-500 text-black'>Header</h1>
      </Column.Segment>

      <Column.Row>
        <div className='p-1 bg-blue-500'>A</div>
        <div className='p-1 bg-red-500'>B</div>
        <div className='p-1 bg-blue-500'>C</div>
      </Column.Row>

      <Column.Segment asChild>
        <div className='py-2'>
          <Input.Root>
            <Input.TextInput placeholder='Search' />
          </Input.Root>
        </div>
      </Column.Segment>

      <List />

      <Column.Segment asChild>
        <Flex column>
          <h1 className='p-1 bg-red-500 text-black'>Section with overflow</h1>
          <pre className='p-1 text-xs text-subdued overflow-auto'>{new Error().stack}</pre>
        </Flex>
      </Column.Segment>

      <Column.Segment asChild>
        <div className='p-1 bg-green-500 text-black'>Footer</div>
      </Column.Segment>
    </Column.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-core/primitives/Column',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-[25rem]' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
