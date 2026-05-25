//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { Morph } from './Morph';

const meta = {
  title: 'ui/react-ui-sfx/Morph',
  component: Morph,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Morph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 32,
    duration: 0.3,
    classNames: 'text-sky-500 dark:text-sky-400',
  },
};
