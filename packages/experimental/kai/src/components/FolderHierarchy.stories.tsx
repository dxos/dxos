//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { FolderHierarchy, mapJsonToHierarchy } from './FolderHierarchy';
import '@dxosTheme';

export default {
  component: FolderHierarchy,
  argTypes: {}
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

export const Default = {
  render: () => {
    // TODO(burdon): Make responsive.
    return <FolderHierarchy items={mapJsonToHierarchy(data)} />;
  }
};
