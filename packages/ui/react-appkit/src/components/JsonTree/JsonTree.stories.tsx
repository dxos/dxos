//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { JsonTree } from './JsonTree';

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
