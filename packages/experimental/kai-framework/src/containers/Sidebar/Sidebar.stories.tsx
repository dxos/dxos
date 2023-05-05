//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { withRouter } from 'storybook-addon-react-router-v6';

import { MainOverlay, MainRoot } from '@dxos/aurora';
import { frameDefs, frameModules, FrameRegistryContextProvider } from '@dxos/kai-frames';
import { MetagraphClientFake } from '@dxos/metagraph';
import { useSpaces } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { MetagraphProvider } from '@dxos/react-metagraph';

import '@dxosTheme';

import { AppStateProvider, createPath, defaultFrames } from '../../hooks';
import { Sidebar } from './Sidebar';

const Test = () => {
  const navigate = useNavigate();
  const spaces = useSpaces();
  useEffect(() => {
    navigate(createPath({ spaceKey: spaces[0].key }));
  }, []);

  // TODO(burdon): Factor out providers or create decorator for Kai storybooks.
  const metagraphContext = {
    client: new MetagraphClientFake(frameModules)
  };

  return (
    <div className='flex w-full h-[100vh] bg-zinc-200'>
      <MetagraphProvider value={metagraphContext}>
        <FrameRegistryContextProvider frameDefs={frameDefs}>
          <AppStateProvider
            initialState={{
              frames: defaultFrames
            }}
          >
            <div className='flex h-[100vh] w-[300px] bg-white'>
              <MainRoot defaultSidebarOpen>
                <MainOverlay />
                <Sidebar onNavigate={() => {}} />
              </MainRoot>
            </div>
          </AppStateProvider>
        </FrameRegistryContextProvider>
      </MetagraphProvider>
    </div>
  );
};

export default {
  component: Sidebar,
  decorators: [ClientSpaceDecorator(), withRouter],
  parameters: {
    layout: 'fullscreen',
    // https://storybook.js.org/addons/storybook-addon-react-router-v6
    reactRouter: {
      routePath: '/:spaceKey',
      routeParams: {
        spaceKey: 'invalid'
      }
    }
  }
};

export const Default = {
  render: () => <Test />
};
