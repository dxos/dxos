//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { FeedGraph } from './FeedGraph';

export default {
  component: FeedGraph,
  argTypes: {}
};

export const Default = {
  render: () => {
    return (
      <div>
        <FeedGraph />
      </div>
    );
  }
};
