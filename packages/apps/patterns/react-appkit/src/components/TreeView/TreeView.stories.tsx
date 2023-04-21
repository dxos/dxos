//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { TreeView, mapJsonToHierarchy } from './TreeView';
import '@dxosTheme';

export default {
  component: TreeView
};

const data = {
  foo: 100,
  bar: {
    zoo: 200
  },
  tags: ['a', 'b', 'c'],
  items: [
    {
      a: true,
      b: 100
    },
    {
      c: 200
    }
  ]
};

export const Default = () => <TreeView items={mapJsonToHierarchy(data)} />;
