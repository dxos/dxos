//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Oscilloscope, type OscilloscopeProps } from './Oscilloscope';

const meta: Meta<OscilloscopeProps> = {
  title: 'ui/react-ui-sfx/Oscilloscope',
  component: Oscilloscope,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<OscilloscopeProps>;

export const Default: Story = {
  args: {
    active: true,
    size: 120,
  },
};
