//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Popup } from './Popup';

export default {
  title: 'apps/composer-crx/Popup',
  component: Popup,
  decorators: [withTheme, withLayout()],
};

export const Default = {
  args: {},
};
