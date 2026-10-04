//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Flex, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PulseSpinner } from './PulseSpinner.tsx';
import { ShapeSpinner } from './ShapeSpinner.tsx';
import { type SpinnerProps } from './Spinner.tsx';

const DefaultStory = ({ state: _state }: SpinnerProps) => {
  const [state, setState] = useState(_state);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => setState('ready')}>Ready</Button>
        <Button onClick={() => setState('thinking')}>Thinking</Button>
        <Button onClick={() => setState('alert')}>Alert</Button>
        <Button onClick={() => setState('error')}>Error</Button>
      </Toolbar.Root>
      {/* Both implementations of the one interface, in the same state. */}
      <Flex grow center gap='lg'>
        <ShapeSpinner state={state} size={6} />
        <PulseSpinner state={state} size={6} />
      </Flex>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-components/Spinner',
  component: ShapeSpinner,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ShapeSpinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
