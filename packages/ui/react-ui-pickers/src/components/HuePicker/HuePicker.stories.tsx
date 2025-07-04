//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { HuePicker, type HuePickerProps } from './HuePicker';

const ToolbarStory = (props: HuePickerProps) => {
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

const meta: Meta = {
  title: 'ui/react-ui-pickers/HuePicker',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default: StoryObj<HuePickerProps> = {
  render: ToolbarStory,
  args: {
    defaultValue: 'red',
  },
};
