//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input, ScrollArea } from '../../components';
import { withLayout, withTheme } from '../../testing';

import { Column } from './Column';
import { Flex } from '../Flex';

const List = () => {
  return (
    <ScrollArea.Root margin role='list'>
      <ScrollArea.Viewport>
        {Array.from({ length: 100 }).map((_, i) => (
          <Input.Root key={i}>
            <Input.TextInput value={`Item ${i}`} />
          </Input.Root>
        ))}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const DefaultStory = () => {
  return (
    <Column.Root classNames='overflow-hidden' gutter='md'>
      <Column.Row center>
        <h1 className='p-1 bg-blue-500 text-black'>Header</h1>
      </Column.Row>

      <Column.Row>
        <div className='p-1 bg-blue-500'>A</div>
        <div className='p-1 bg-red-500'>B</div>
        <div className='p-1 bg-blue-500'>C</div>
      </Column.Row>

      <Column.Row asChild center>
        <div className='py-2'>
          <Input.Root>
            <Input.TextInput placeholder='Search' />
          </Input.Root>
        </div>
      </Column.Row>

      <Column.Row classNames='overflow-hidden'>
        <List />
      </Column.Row>

      <Column.Row asChild center>
        <Flex column>
          <h1 className='p-1 bg-red-500 text-black'>Section with overflow</h1>
          <pre className='p-1 text-xs text-subdued overflow-auto'>{new Error().stack}</pre>
        </Flex>
      </Column.Row>

      <Column.Row center>
        <div className='p-1 bg-green-500 text-black'>Footer</div>
      </Column.Row>
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

export const Raw = {
  render: () => {
    return (
      <div className='grid grid-cols-[2rem_1fr_2rem]'>
        <div className='col-span-full grid grid-cols-subgrid'>
          <div className='bg-red-surface'>A</div>
          <div className='bg-green-surface'>B</div>
          <div className='bg-blue-surface'>C</div>
        </div>
        <div className='col-span-full grid grid-cols-subgrid col-start-2'>
          <div className='bg-green-surface'>B</div>
        </div>
      </div>
    );
  },
};

const InputList = ({ items = 50 }: { items?: number }) => (
  <div className='flex flex-col gap-2'>
    {Array.from({ length: items }).map((_, index) => (
      <Input.Root key={index}>
        <Input.TextInput value={`Item ${index + 1}`} />
      </Input.Root>
    ))}
  </div>
);

export const WithColumn = {
  decorators: [withLayout({ layout: 'column' })],
  render: () => (
    <Column.Root classNames='overflow-hidden' gutter='md'>
      <Column.Row center>
        <h2>Header</h2>
      </Column.Row>
      <ScrollArea.Root padding margin orientation='vertical' classNames='col-span-full border border-blue-500'>
        <ScrollArea.Viewport classNames='_border _border-red-500'>
          <div>A</div>
          <InputList items={3} />
          {/* <Column.Row center>
            <InputList items={3} />
          </Column.Row> */}
          <div>Z</div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <Column.Row center>
        <h2>Footer</h2>
      </Column.Row>
    </Column.Root>
  ),
};
