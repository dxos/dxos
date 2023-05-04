//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { FullscreenDecorator } from '@dxos/kai-frames';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

const Surface = () => <div />;

export default {
  component: Surface,
  decorators: [FullscreenDecorator(), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen'
  }
};

const TestApp = () => {};

export const Default = {
  render: () => <TestApp />
};
