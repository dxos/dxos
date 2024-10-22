//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { type FC } from 'react';

import { Searchbar, type SearchbarProps } from './Searchbar';

const Story: FC<SearchbarProps> = (args) => {
  return <Searchbar {...args} />;
};

export default {
  title: 'plugin-search/Searchbar',
  component: Searchbar,
  render: Story,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  args: {
    placeholder: 'Search...',
  },
};
