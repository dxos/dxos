//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { IconButton, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { createPattern } from './sounds';

const DefaultStory = () => {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) {
      return;
    }

    const action = createPattern();
    void action.start();
    return () => void action.stop();
  }, [running]);

  return (
    <Toolbar.Root>
      <IconButton
        icon='ph--play--regular'
        iconOnly
        variant='ghost'
        size={16}
        label='play'
        onClick={() => setRunning(true)}
      />
      <IconButton
        icon='ph--stop--regular'
        iconOnly
        variant='ghost'
        size={16}
        label='stop'
        onClick={() => setRunning(false)}
      />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/sounds',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
