//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { create } from '@dxos/react-client/echo';

import Wildcard from './Wildcard';

export default {
  title: 'plugin-wildcard/Wildcard',
  component: Wildcard,
  args: {
    item: { id: 'test', object: create({ title: 'Test', other: 'details' }) },
  },
};

export const Default = {};
