//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { FeedGraph } from './FeedGraph';

export default {
  component: FeedGraph,
  argTypes: {},
};

export const Default = {
  render: () => {
    return (
      <div>
        <FeedGraph />
      </div>
    );
  },
};
