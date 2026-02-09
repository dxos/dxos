//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { IconPicker, type IconPickerProps } from './IconPicker';

const DefaultStory = (props: IconPickerProps) => {
  const [icon, setIcon] = useState<string | undefined>(props.value ?? props.defaultValue);
  console.log(icon);

  return (
    <Toolbar.Root>
      <IconPicker {...props} value={icon} onChange={setIcon} onReset={() => setIcon(undefined)} />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-pickers/IconPicker',
  component: IconPicker,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column' })],
} satisfies Meta<typeof IconPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
