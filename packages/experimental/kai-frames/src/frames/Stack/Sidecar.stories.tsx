//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { TestFrameContainer } from '../../testing';
import Sidecar from './Sidecar';
import { StackFrameRuntime } from './defs';

import '@dxosTheme';

export default {
  component: Sidecar,
  parameters: {
    layout: 'fullscreen'
  }
};

// TODO(burdon): Decorator to enable bots to auto-join (fixed topic).

export const Default = {
  decorators: [ClientSpaceDecorator()],
  render: () => (
    <TestFrameContainer<DocumentStack> onCreate={StackFrameRuntime.onCreate!}>
      <Sidecar />
    </TestFrameContainer>
  )
};
