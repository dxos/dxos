//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Matrix, type MatrixProps } from './Matrix';

const DefaultStory = (props: MatrixProps) => {
  const [, forceUpdate] = useState({});

  return (
    <div className='flex flex-col grow'>
      <Toolbar.Root>
        <Button onClick={() => forceUpdate({})}>Toggle</Button>
      </Toolbar.Root>
      <div className='flex grow items-center justify-center'>
        <Matrix {...props} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Matrix',
  component: Matrix,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Matrix>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    dim: 5,
    count: 20,
  },
};
