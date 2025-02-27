//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Oscilloscope, type OscilloscopeProps } from './Oscilloscope';

const meta: Meta<OscilloscopeProps> = {
  title: 'ui/react-ui-sfx/Oscilloscope',
  component: Oscilloscope,
  render: () => {
    return (
      <div className='flex grow items-center justify-center'>
        <Oscilloscope size={128} active />
      </div>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<OscilloscopeProps>;

export const Default: Story = {
  args: {
    active: true,
  },
};
