//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { withTheme, withTooltipProvider } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';

export default {
  title: 'plugin-script/Toolbar',
  component: Toolbar,
  decorators: [withTheme, withTooltipProvider],
};

export const Default = { args: { binding: 'example', deployed: true } };
