//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';

import { Searchbar, type SearchbarProps } from './Searchbar';

const meta: Meta<SearchbarProps> = {
  title: 'plugins/plugin-search/Searchbar',
  component: Searchbar,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  args: {
    placeholder: 'Search...',
  },
};

export default meta;
