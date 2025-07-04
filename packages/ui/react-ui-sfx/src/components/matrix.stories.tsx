//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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

const meta: Meta<MatrixProps> = {
  title: 'ui/react-ui-sfx/Matrix',
  component: Matrix,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<MatrixProps>;

export const Default: Story = {
  args: {
    dim: 5,
    count: 20,
  },
};
