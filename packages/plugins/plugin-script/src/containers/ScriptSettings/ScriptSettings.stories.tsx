//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { ScriptSettings } from './ScriptSettings';

const meta = {
  title: 'plugins/plugin-script/containers/ScriptSettings',
  component: ScriptSettings,
  tags: ['settings'],
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ScriptSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: { editorInputMode: 'default' },
  },
};
