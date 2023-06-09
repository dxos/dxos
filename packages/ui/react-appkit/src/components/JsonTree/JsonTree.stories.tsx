//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { JsonTree } from './JsonTree';
import '@dxosTheme';

export default {
  component: JsonTree,
};

const data = {
  foo: 100,
  bar: {
    zoo: 200,
  },
  tags: ['a', 'b', 'c'],
  items: [
    {
      a: true,
      b: 100,
    },
    {
      c: 200,
    },
  ],
};

export const Json = () => <JsonTree data={data} />;
