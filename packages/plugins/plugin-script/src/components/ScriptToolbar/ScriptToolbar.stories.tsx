//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { ClientPlugin } from '@dxos/plugin-client';
import { DataType } from '@dxos/schema';

import { ScriptToolbar } from './ScriptToolbar';

const meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: ScriptToolbar,
  // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
  decorators: [withPluginManager({ plugins: [IntentPlugin(), ClientPlugin({})] })],
} satisfies Meta<typeof ScriptToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    script: Obj.make(ScriptType, {
      name: 'test',
      description: 'test',
      source: Ref.make(DataType.makeText('test')),
    }),
    state: {},
  },
};
