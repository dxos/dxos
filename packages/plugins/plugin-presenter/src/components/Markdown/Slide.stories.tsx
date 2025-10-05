//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';
import { createSlide } from '../../testing';

import { Slide } from './Slide';

const meta = {
  title: 'plugins/plugin-presenter/Slide',
  component: Slide,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Slide>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: createSlide(),
  },
};

export const Code: Story = {
  args: {
    content: createSlide({ code: true }),
  },
};
