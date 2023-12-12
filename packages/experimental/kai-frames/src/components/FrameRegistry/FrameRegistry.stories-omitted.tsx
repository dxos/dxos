//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { MetagraphClientFake } from '@dxos/metagraph';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { MetagraphProvider } from '@dxos/react-metagraph';

import { FrameRegistry } from './FrameRegistry';
import { frameDefs } from '../../frames';
import { FrameRegistryContextProvider, useFrameRegistry } from '../../hooks';
import { FullscreenDecorator } from '../../testing';

export default {
  component: FrameRegistry,
  parameters: {
    layout: 'fullscreen',
  },
};

const Test = () => {
  const frameRegistry = useFrameRegistry();

  return (
    <FrameRegistry
      frames={frameRegistry.frames}
      slots={{
        tile: {
          className: 'bg-white',
        },
      }}
    />
  );
};

const TestContainer = () => {
  // TODO(burdon): Clean-up.
  const metagraphContext = {
    client: new MetagraphClientFake([]),
  };

  return (
    <MetagraphProvider value={metagraphContext}>
      <FrameRegistryContextProvider frameDefs={frameDefs}>
        <Test />
      </FrameRegistryContextProvider>
    </MetagraphProvider>
  );
};

export const Default = {
  decorators: [FullscreenDecorator('items-center'), ClientSpaceDecorator()],
  render: () => <TestContainer />,
};
