//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IconPicker, type IconPickerProps } from './IconPicker';

const ToolbarStory = (props: IconPickerProps) => {
  const [icon, setIcon] = useState<string | undefined>(props.value ?? props.defaultValue);
  console.log(icon);

  return (
    <Toolbar.Root>
      <IconPicker {...props} value={icon} onChange={setIcon} onReset={() => setIcon(undefined)} />
    </Toolbar.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-pickers/IconPicker',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<IconPickerProps> = {
  render: ToolbarStory,
  args: {},
};
