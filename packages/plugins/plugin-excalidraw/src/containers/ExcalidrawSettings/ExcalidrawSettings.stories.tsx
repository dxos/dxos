//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ExcalidrawSettings } from './ExcalidrawSettings';

const meta = {
  title: 'plugins/plugin-excalidraw/containers/ExcalidrawSettings',
  component: ExcalidrawSettings,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  tags: ['settings'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ExcalidrawSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      autoHideControls: true,
      gridType: 'mesh',
    },
  },
};
