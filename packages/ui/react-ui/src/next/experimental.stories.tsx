//
// Copyright 2026 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../testing/index.ts';
import { Next } from './components.tsx';
import { SIZES } from './sizes.ts';

const DefaultStory = () => {
  return (
    <div className='flex flex-col divide-y divide-separator'>
      <Next.Container size='lg' asChild>
        <div className='grid grid-cols-[min-content_1fr] gap-1'>
          <div>
            <Next.Block>
              <Next.Icon icon='ph--circle--regular' />
            </Next.Block>
          </div>
          <Next.Typography>Lorem ipsum dolor sit amet</Next.Typography>
        </div>
      </Next.Container>

      <Next.Container size='lg' asChild>
        <div className='grid grid-cols-[min-content_1fr] gap-1'>
          <div>
            <Next.Block>
              <Next.Icon icon='ph--circle--regular' />
            </Next.Block>
          </div>
          <Next.Typography>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
            ea commodo consequat.
          </Next.Typography>
        </div>
      </Next.Container>

      <div>
        {SIZES.map((size) => (
          <Next.Toolbar key={size} size={size}>
            <Next.Block>
              <Next.Icon icon='ph--circle--regular' />
            </Next.Block>
            <Next.Input placeholder='Input' aria-label={`Name (${size})`} />
            <Next.Button>Save</Next.Button>
            <Next.Block>
              <Next.Icon icon='ph--circle--regular' />
            </Next.Block>
          </Next.Toolbar>
        ))}
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/playground/experimental',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[30rem]' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

export const Default = {};
