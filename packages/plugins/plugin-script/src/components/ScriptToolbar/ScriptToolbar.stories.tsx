//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { ClientPlugin } from '@dxos/plugin-client';
import { withTheme } from '@dxos/react-ui/testing';
import { DataType } from '@dxos/schema';

import { translations } from '../../translations';

import { ScriptToolbar } from './ScriptToolbar';

const meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: ScriptToolbar,
  // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
  decorators: [withTheme, withPluginManager({ plugins: [IntentPlugin(), ClientPlugin({})] })],
  parameters: {
    layout: {
      type: 'centered',
      className: 'is-prose',
    },
    translations,
  },
} satisfies Meta<typeof ScriptToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: {},
    script: Obj.make(ScriptType, {
      name: 'test',
      description: 'test',
      source: Ref.make(DataType.makeText('test')),
    }),
  },
};
