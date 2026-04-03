//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ScriptPluginSettings } from './ScriptPluginSettings';

const meta = {
  title: 'plugins/plugin-script/containers/ScriptPluginSettings',
  component: ScriptPluginSettings,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ScriptPluginSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: { editorInputMode: 'default' },
  },
};
