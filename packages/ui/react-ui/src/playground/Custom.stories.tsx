//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Button, type ButtonProps, IconButton, Tooltip } from '../components';
import { withTheme } from '../testing';

const DefaultStory = ({ children, ...args }: Omit<ButtonProps, 'ref'>) => {
  return (
    <Tooltip.Provider>
      <div className='flex flex-col gap-6'>
        {/* Large */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <Button {...args} density='coarse'>
              {children}
            </Button>
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--atom--regular' size={7} density='coarse' />
          </div>
          <div className='flex justify-center'>
            <IconButton
              {...args}
              label='Test'
              icon='ph--atom--regular'
              iconOnly
              size={7}
              density='coarse'
              classNames='px-1.5'
            />
          </div>
        </div>

        {/* Medium */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <Button {...args} density='fine'>
              {children}
            </Button>
          </div>
          <div className='flex justify-center'>
            <IconButton {...args} label='Test' icon='ph--atom--regular' density='fine' classNames='px-2' />
          </div>
          <div className='flex justify-center'>
            <IconButton
              {...args}
              label='Test'
              icon='ph--atom--regular'
              iconOnly
              density='fine'
              classNames='py-1 px-1.5'
            />
          </div>
        </div>

        {/* Small */}
        <div className='grid grid-cols-3 gap-4'>
          <div className='flex justify-center'>
            <Button {...args} density='fine' classNames={'!h-[24px] !text-[14px] p-0 px-1.5 min-bs-0'}>
              {children}
            </Button>
          </div>
          <div className='flex justify-center'>
            <IconButton
              {...args}
              label='Test'
              icon='ph--atom--regular'
              density='fine'
              size={4}
              classNames={'!h-[24px] !text-[14px] p-1 min-bs-0 gap-0.5'}
            />
          </div>
          <div className='flex justify-center'>
            <IconButton
              {...args}
              label='Test'
              icon='ph--atom--regular'
              iconOnly
              density='fine'
              size={4}
              classNames={'!h-[24px] !text-[14px] p-1 min-bs-0'}
            />
          </div>
        </div>

        {/* TODO(burdon): Full variant with max width. */}
        <div className='flex justify-center'>
          <Button classNames='w-full max-w-[15rem] rounded' variant='default'>
            Test
          </Button>
        </div>
        <div className='flex justify-center'>
          {/* TODO(burdon): Option to have button on RHS. Default size for icon should be 5 for this (medium) density. */}
          <IconButton
            classNames='w-full max-w-[15rem] rounded'
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
  title: 'ui/react-ui-core/Playground/Custom',
  component: Button,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Test' },
};
