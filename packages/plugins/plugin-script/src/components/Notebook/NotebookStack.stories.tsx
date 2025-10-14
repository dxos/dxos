//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { NotebookStack } from './NotebookStack';
import { notebook } from './testing';

const meta = {
  title: 'plugins/plugin-script/NotebookStack',
  component: NotebookStack,
  decorators: [withTheme],
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
