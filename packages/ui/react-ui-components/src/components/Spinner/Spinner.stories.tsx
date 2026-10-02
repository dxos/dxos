//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Spinner, type SpinnerProps } from './Spinner.tsx';

const DefaultStory = ({ state: _state }: SpinnerProps) => {
  const [state, setState] = useState(_state);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button.Root onClick={() => setState('pulse')}>Pulse</Button.Root>
        <Button.Root onClick={() => setState('spin')}>Spin</Button.Root>
        <Button.Root onClick={() => setState('flash')}>Flash</Button.Root>
        <Button.Root onClick={() => setState('error')}>Error</Button.Root>
      </Toolbar.Root>
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
