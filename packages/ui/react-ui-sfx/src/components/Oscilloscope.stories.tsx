//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Oscilloscope } from './Oscilloscope';

const meta = {
  title: 'ui/react-ui-sfx/Oscilloscope',
  component: Oscilloscope,
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Oscilloscope>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    active: true,
    size: 120,
  },
};
