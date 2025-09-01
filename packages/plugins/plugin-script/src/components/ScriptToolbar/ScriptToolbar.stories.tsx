//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ScriptToolbar } from './ScriptToolbar';

const meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: ScriptToolbar,
  decorators: [withTheme, withLayout()],
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
