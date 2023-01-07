//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { Group } from './Group';

export default {
  component: Group
};

export const Default = {
  args: {
    label: { level: 3, children: 'Hello' },
    children: 'This is a group.',
    elevation: 3
  }
};
