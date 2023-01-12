//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { FolderHierarchy } from './FolderHierarchy';

export default {
  component: FolderHierarchy,
  argTypes: {}
};

export const Default = {
  render: () => {
    // TODO(burdon): Make responsive.
    return <FolderHierarchy items={[]} />;
  }
};
