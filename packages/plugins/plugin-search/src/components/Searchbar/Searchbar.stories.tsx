//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { Searchbar, type SearchbarProps } from './Searchbar';

const meta: Meta<SearchbarProps> = {
  title: 'plugins/plugin-search/Searchbar',
  component: Searchbar,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

export const Default = {
  args: {
    placeholder: 'Search...',
  },
};
