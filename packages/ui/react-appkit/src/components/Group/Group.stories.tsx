//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { withTheme } from '@dxos/storybook-utils';

import { Group } from './Group';

export default {
  component: Group,
  decorators: [withTheme],
};

export const Default = {
  args: {
    label: { level: 3, children: 'Hello' },
    children: 'This is a group.',
    elevation: 'group',
  },
};
