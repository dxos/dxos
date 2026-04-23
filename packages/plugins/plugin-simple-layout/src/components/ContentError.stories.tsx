//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { ErrorFallback } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

const meta = {
  title: 'plugins/plugin-simple-layout/components/ErrorFallback',
  component: ErrorFallback,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ErrorFallback>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: new Error('An unexpected error occurred'),
  },
};

export const WithError: Story = {
  args: {
    error: new Error('Something went wrong while loading the content'),
  },
};

export const WithTypeError: Story = {
  args: {
    error: new TypeError('Cannot read property "foo" of undefined'),
  },
};
