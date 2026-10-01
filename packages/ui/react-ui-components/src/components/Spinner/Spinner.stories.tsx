//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Next } from '@dxos/react-ui/next';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Spinner, type SpinnerProps } from './Spinner.tsx';

const DefaultStory = ({ state: _state }: SpinnerProps) => {
  const [state, setState] = useState(_state);

  return (
    <div className='flex flex-col grow'>
      <Next.Toolbar.Root>
        <Next.Button onClick={() => setState('pulse')}>Pulse</Next.Button>
        <Next.Button onClick={() => setState('spin')}>Spin</Next.Button>
        <Next.Button onClick={() => setState('flash')}>Flash</Next.Button>
        <Next.Button onClick={() => setState('error')}>Error</Next.Button>
      </Next.Toolbar.Root>
      <div className='flex grow items-center justify-center'>
        <Spinner state={state} size={6} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/Spinner',
  component: Spinner,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
