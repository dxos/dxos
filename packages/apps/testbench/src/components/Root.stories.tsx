//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { DensityProvider } from '@dxos/react-ui';

import { Root } from './Root';

const Story = () => (
  <DensityProvider density='fine'>
    <Root />
  </DensityProvider>
);

export default {
  title: 'testbench',
  component: Root,
  render: () => <ClientRepeater component={Story} createSpace />,
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
