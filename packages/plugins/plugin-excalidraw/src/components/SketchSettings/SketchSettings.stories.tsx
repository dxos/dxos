//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { SketchSettings } from './SketchSettings';

const meta = {
  title: 'plugins/plugin-excalidraw/components/SketchSettings',
  component: SketchSettings,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  tags: ['settings'],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SketchSettings>;

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
