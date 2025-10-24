//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Script } from '@dxos/functions';
import { ClientPlugin } from '@dxos/plugin-client';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { ScriptToolbar } from './ScriptToolbar';

const meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: ScriptToolbar,
  // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
  decorators: [
    withTheme,
    withLayout({ classNames: 'is-prose' }),
    withPluginManager({
      plugins: [IntentPlugin(), ClientPlugin({})],
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ScriptToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: {},
    script: Script.make({
      name: 'test',
      description: 'test',
      source: 'test',
    }),
  },
};
