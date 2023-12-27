//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { FeedGraph } from './FeedGraph';

export default {
  component: FeedGraph,
  decorators: [withTheme],
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
