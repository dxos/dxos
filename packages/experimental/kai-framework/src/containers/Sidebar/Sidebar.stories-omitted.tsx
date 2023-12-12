//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { withRouter } from 'storybook-addon-react-router-v6';

import { frameDefs, frameModules, FrameRegistryContextProvider } from '@dxos/kai-frames';
import { MetagraphClientFake } from '@dxos/metagraph';
import { useSpaces } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { MetagraphProvider } from '@dxos/react-metagraph';
import { Button, Main, useSidebars } from '@dxos/react-ui';

import { Sidebar } from './Sidebar';
import { AppStateProvider, createPath, defaultFrames } from '../../hooks';

const SidebarInvoker = () => {
  const { openNavigationSidebar } = useSidebars();
  return <Button onClick={openNavigationSidebar}>Open</Button>;
};

const Test = () => {
  const navigate = useNavigate();
  const spaces = useSpaces();
  useEffect(() => {
    navigate(createPath({ spaceKey: spaces[0].key }));
  }, []);

  // TODO(burdon): Factor out providers or create decorator for Kai storybooks.
  const metagraphContext = {
    client: new MetagraphClientFake(frameModules),
  };

  return (
    <div className='flex w-full h-[100vh] bg-zinc-200'>
      <MetagraphProvider value={metagraphContext}>
        <FrameRegistryContextProvider frameDefs={frameDefs}>
          <AppStateProvider
            initialState={{
              frames: defaultFrames,
            }}
          >
            <Main.Root>
              <Main.Overlay />
              <Sidebar onNavigate={() => {}} />
              <Main.Content>
                <SidebarInvoker />
              </Main.Content>
            </Main.Root>
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
        spaceKey: 'invalid',
      },
    },
  },
};

export const Default = {
  render: () => <Test />,
};
