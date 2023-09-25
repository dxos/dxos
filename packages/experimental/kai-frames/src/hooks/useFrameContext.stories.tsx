//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { MetagraphProvider } from '@dxos/react-metagraph';

import { FrameContextProvider, FrameRegistryContextProvider, useFrameContext } from './useFrameContext';

export default {
  component: FrameContextProvider,
  parameters: {
    layout: 'fullscreen',
  },
};

const TestFrame = () => {
  const { space } = useFrameContext();
  return (
    <div className='flex w-full justify-center'>
      <div className='flex w-[600px] m-4 p-2 overflow-hidden bg-white'>
        <div>{space!.key.truncate()}</div>
      </div>
    </div>
  );
};

const TestApp = () => {
  // TODO(burdon): Replace fake with memory backend.
  // const metagraph = new MetagraphClientFake([]);
  const spaces = useSpaces();
  if (!spaces.length) {
    return null;
  }

  // TODO(burdon): FrameRegistry (use DMG with runtime bindings).

  return (
    <MetagraphProvider>
      <FrameRegistryContextProvider>
        <FrameContextProvider state={{ space: spaces[0] }}>
          <TestFrame />
        </FrameContextProvider>
      </FrameRegistryContextProvider>
    </MetagraphProvider>
  );
};

export const Default = {
  decorators: [ClientSpaceDecorator()],
  render: () => <TestApp />,
};
