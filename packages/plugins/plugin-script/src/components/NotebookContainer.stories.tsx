//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createNotebook } from '../testing';
import { translations } from '../translations';

import { NotebookContainer } from './NotebookContainer';

const meta = {
  title: 'plugins/plugin-script/NotebookContainer',
  component: NotebookContainer,
  decorators: [withTheme, withLayout({ container: 'column', classNames: 'is-prose' }), withClientProvider()],
  parameters: {
    translations,
  },
} satisfies Meta<typeof NotebookContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    notebook: createNotebook(),
  },
};
