//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { AppContainer } from './AppContainer';
import { Main } from './Main';
import { ItemType } from '../data';

const Story = () => (
  <DensityProvider density='fine'>
    <Main />
  </DensityProvider>
);

export default {
  title: 'testbench-app/Main',
  component: Main,
  render: () => (
    <AppContainer>
      <ClientRepeater component={Story} count={2} types={[ItemType]} createSpace />
    </AppContainer>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
