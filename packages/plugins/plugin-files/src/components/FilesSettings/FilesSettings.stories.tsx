//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { FilesSettings } from './FilesSettings';

const meta = {
  title: 'plugins/plugin-files/components/FilesSettings',
  component: FilesSettings,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof FilesSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      autoExport: false,
      autoExportInterval: 30000,
      openLocalFiles: false,
    },
    state: {
      rootHandle: undefined,
      exportRunning: false,
      files: [],
      current: undefined,
    },
  },
};
