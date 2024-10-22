//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { AppContainer } from './AppContainer';
import { Main } from './Main';
import { ItemType } from '../data';

export default {
  title: 'testbench-app/Main',
  component: Main,
  render: () => (
    <AppContainer>
      <ClientRepeater component={Main} count={2} types={[ItemType]} createSpace />
    </AppContainer>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
