//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { FullscreenDecorator } from '@dxos/kai-frames';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import '@dxosTheme';

import { TestApp } from './TestApp';

export default {
  component: TestApp,
  decorators: [FullscreenDecorator(), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <TestApp />
};
