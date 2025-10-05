//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';

import { HuePicker, type HuePickerProps } from './HuePicker';

const DefaultStory = (props: HuePickerProps) => {
  const [hue, setHue] = useState<string | undefined>(props.defaultValue);

  return (
    <Toolbar.Root>
      <HuePicker
        {...props}
        value={hue}
        onChange={setHue}
        onReset={() => setHue(undefined)}
        rootVariant='toolbar-button'
      />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-pickers/HuePicker',
  component: HuePicker,
  render: DefaultStory,
  parameters: {
    layout: 'column',
  },
} satisfies Meta<typeof HuePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: 'red',
  },
};
