//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import { templates } from '../../templates';

const meta: Meta = {
  title: 'plugins/plugin-script/Toolbar',
  component: Toolbar,
  decorators: [withTheme, withLayout({ tooltips: true })],
};

export const Default = {
  args: {
    binding: 'example',
    deployed: true,
    templates,
    onFormat: () => console.log('Format'),
    onTogglePanel: () => {},
  },
};
export default meta;
