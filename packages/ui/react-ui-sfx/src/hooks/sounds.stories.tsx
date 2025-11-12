//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo } from 'react';

import { IconButton, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Sounds } from './sounds';

const DefaultStory = () => {
  const sounds = useMemo(() => new Sounds(), []);
  useEffect(() => {
    void sounds.init();
  }, []);

  return (
    <Toolbar.Root>
      <IconButton icon='ph--play--regular' iconOnly label='play' onClick={() => sounds.play()} />
      <IconButton icon='ph--play--regular' iconOnly label='play' onClick={() => sounds.blip()} />
      <IconButton icon='ph--play--regular' iconOnly label='play' onClick={() => sounds.click()} />
      <IconButton icon='ph--play--regular' iconOnly label='play' onClick={() => sounds.laser()} />
      <IconButton icon='ph--play--regular' iconOnly label='play' onClick={() => sounds.pling()} />
      <IconButton icon='ph--play--regular' iconOnly label='play' onClick={() => sounds.notify()} />
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
