//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type ButtonProps, Button, IconButton, Tooltip } from '../components';
import { withTheme } from '../testing';

const DefaultStory = ({ children, ...args }: Omit<ButtonProps, 'ref'>) => {
  return (
    <Tooltip.Provider>
      <div className='flex flex-col gap-6'>
        {/* Large (40px) */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <Button {...args} density='lg'>
              {children}
            </Button>
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--circle--regular' density='lg' />
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--circle--regular' iconOnly density='lg' classNames='px-1.5' />
          </div>
        </div>

        {/* Medium (32px, default) */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <Button {...args} density='md'>
              {children}
            </Button>
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--circle--regular' density='md' classNames='px-2' />
          </div>
          <div className='flex justify-center'>
            <IconButton
              {...args}
              label='Test'
              icon='ph--circle--regular'
              iconOnly
              density='md'
              classNames='py-1 px-1.5'
            />
          </div>
        </div>

        {/* Small (28px) */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <Button {...args} density='sm'>
              {children}
            </Button>
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--circle--regular' density='sm' />
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--circle--regular' iconOnly density='sm' />
          </div>
        </div>

        {/* TODO(burdon): Full variant with max width. */}
        <div className='flex justify-center'>
          <Button classNames='w-full max-w-[15rem] rounded-sm' variant='default'>
            Test
          </Button>
        </div>
        <div className='flex justify-center'>
          {/* TODO(burdon): Option to have button on RHS. Default size for icon should be 5 for this (medium) density. */}
          <IconButton
            classNames='w-full max-w-[15rem] rounded-sm'
            variant='primary'
            icon='ph--arrows-clockwise--regular'
            label='Test'
          />
        </div>
      </div>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/playground/Custom',
  component: Button,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Test' },
};
