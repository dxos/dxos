//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Popup } from './Popup';

export default {
  title: 'apps/composer-crx/Popup',
  component: Popup,
  decorators: [withTheme, withLayout({ density: 'fine' })],
};

export const Default = {
  args: {},
};
