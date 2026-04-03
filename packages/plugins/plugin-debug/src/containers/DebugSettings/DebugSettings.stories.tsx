//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { DebugSettings } from './DebugSettings';

const meta = {
  title: 'plugins/plugin-debug/containers/DebugSettings',
  component: DebugSettings,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DebugSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      wireframe: false,
    },
    logBuffer: { serialize: () => '' } as any,
  },
};
