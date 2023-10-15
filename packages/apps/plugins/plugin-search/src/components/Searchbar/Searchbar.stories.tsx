//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC } from 'react';

import { Button, DensityProvider } from '@dxos/aurora';

import { Searchbar, type SearchbarProps } from './Searchbar';

const Story: FC<SearchbarProps> = (args) => {
  return (
    <DensityProvider density='fine'>
      <Searchbar {...args} />
      <Button variant='primary'>Test</Button>
    </DensityProvider>
  );
};

export default {
  component: Story,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  args: {
    placeholder: 'Search...',
  },
};
