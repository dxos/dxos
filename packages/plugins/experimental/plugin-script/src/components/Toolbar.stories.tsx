//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';

export default {
  title: 'plugin-script/Toolbar',
  component: Toolbar,
  decorators: [withTheme, withLayout({ tooltips: true })],
};

export const Default = { args: { binding: 'example', deployed: true } };
