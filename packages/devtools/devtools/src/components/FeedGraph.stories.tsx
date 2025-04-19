//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { FeedGraph } from './FeedGraph';

export default {
  title: 'devtools/devtools/FeedGraph',
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
