//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { templates } from '../../templates';

import { ScriptToolbar } from './ScriptToolbar';

export const Default = {
  args: {
    binding: 'example',
    deployed: true,
    templates,
    onFormat: () => console.log('Format'),
    onTogglePanel: () => {},
  },
};

const meta: Meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: ScriptToolbar,
  decorators: [withTheme, withLayout()],
};

export default meta;
