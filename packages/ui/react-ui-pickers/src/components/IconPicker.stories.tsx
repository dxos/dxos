//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { IconPicker, type IconPickerProps } from './IconPicker';

const ToolbarStory = (props: IconPickerProps) => {
  const [icon, setIcon] = useState<string | undefined>(props.defaultValue);

  return (
    <Toolbar.Root>
      <IconPicker {...props} value={icon} onChange={setIcon} onReset={() => setIcon(undefined)} />
    </Toolbar.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-pickers/IconPicker',
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<IconPickerProps> = {
  render: ToolbarStory,
  args: {},
};
