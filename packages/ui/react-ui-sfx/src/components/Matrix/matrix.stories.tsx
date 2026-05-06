//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Matrix, type MatrixProps } from './Matrix';

const DefaultStory = (props: MatrixProps) => {
  const [active, setActive] = useState(props.active ?? true);

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => setActive((a) => !a)}>{active ? 'Stop' : 'Start'}</Button>
      </Toolbar.Root>
      <div className='flex grow items-center justify-center'>
        <Matrix {...props} active={active} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Matrix',
  component: Matrix,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Matrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    active: false,
    dim: 8,
    gap: 2,
    dotSize: 13,
    count: 30,
    classNames: 'border border-primary-500 w-32 h-32',
    dotClassNames: '_border _border-primary-500 bg-primary-900 rounded',
  },
};

export const Small: Story = {
  args: {
    active: false,
    dim: 5,
    dotSize: 3,
    count: 20,
    classNames: 'w-6 h-6',
    dotClassNames: 'bg-primary-500 rounded',
  },
};
