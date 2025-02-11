//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { HuePickerBlock, HuePickerToolbarButton, type HuePickerProps } from './HuePicker';

const ToolbarStory = (props: HuePickerProps) => {
  const [hue, setHue] = useState<string>(props.defaultHue ?? 'red');

  return (
    <Toolbar.Root>
      <HuePickerToolbarButton {...props} hue={hue} onChangeHue={setHue} />
    </Toolbar.Root>
  );
};

const BlockStory = (props: HuePickerProps) => {
  const [hue, setHue] = useState<string>(props.defaultHue ?? 'red');

  return (
    <div className='flex gap-2'>
      <HuePickerBlock
        {...props}
        hue={hue}
        onChangeHue={setHue}
        onClickClear={() => setHue(props.defaultHue ?? 'red')}
      />
    </div>
  );
};

export const ToolbarButtonStory: StoryObj<HuePickerProps> = {
  render: ToolbarStory,
  args: { defaultHue: 'red' },
};

export const BlockPickerStory: StoryObj<HuePickerProps> = {
  render: BlockStory,
  args: { defaultHue: 'red' },
};

const meta: Meta = {
  title: 'ui/react-ui-pickers/HuePicker',
  decorators: [withTheme, withLayout({ fullscreen: false, tooltips: true })],
};

export default meta;
