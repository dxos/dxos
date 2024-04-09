//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { DensityProvider } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { MainContainer } from './Main';
import { Root } from './Root';

const Story = () => (
  <DensityProvider density='fine'>
    <Root />
  </DensityProvider>
);

// TODO(burdon): Configure clients to use space created by repeater.

export default {
  title: 'testbench-app',
  component: Root,
  render: () => (
    <MainContainer>
      <ClientRepeater component={Story} createSpace count={2} />
    </MainContainer>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
