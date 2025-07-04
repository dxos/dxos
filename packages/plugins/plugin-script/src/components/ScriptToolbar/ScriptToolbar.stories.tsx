//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ScriptToolbar } from './ScriptToolbar';
import { templates } from '../../templates';

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
