//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { notebook } from '../../testing';
import { translations } from '../../translations';

import { NotebookStack } from './NotebookStack';

const meta = {
  title: 'plugins/plugin-script/NotebookStack',
  component: NotebookStack,
  decorators: [withTheme, withClientProvider()],
  parameters: {
    layout: {
      type: 'column',
      className: 'is-prose',
    },
    translations,
  },
} satisfies Meta<typeof NotebookStack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    notebook,
  },
};
