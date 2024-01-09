//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { TypedObject } from '@dxos/react-client/echo';

import { Wildcard } from './Wildcard';

export default {
  title: 'plugin-wildcard/Wildcard',
  component: Wildcard,
  args: {
    item: { id: 'test', object: new TypedObject({ title: 'Test', other: 'details' }) },
  },
};

export const Default = {};
