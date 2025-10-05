//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Oscilloscope } from './Oscilloscope';

const meta = {
  title: 'ui/react-ui-sfx/Oscilloscope',
  component: Oscilloscope,
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
