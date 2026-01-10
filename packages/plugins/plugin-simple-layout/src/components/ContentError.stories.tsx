//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

import { ContentError } from './ContentError';

const meta = {
  title: 'plugins/plugin-simple-layout/ContentError',
  component: ContentError,
  decorators: [
    withTheme,
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins()],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ContentError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
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
