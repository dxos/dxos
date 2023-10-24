//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC } from 'react';

import { DensityProvider } from '@dxos/react-ui';

import { Searchbar, type SearchbarProps } from './Searchbar';

const Story: FC<SearchbarProps> = (args) => {
  return (
    <DensityProvider density='coarse'>
      <Searchbar {...args} />
    </DensityProvider>
  );
};

export default {
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
