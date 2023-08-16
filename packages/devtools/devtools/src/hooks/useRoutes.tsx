//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes as useRouterRoutes } from 'react-router-dom';

import { RootContainer } from '../containers';
import {
  ConfigPanel,
  CredentialsPanel,
  DiagnosticsPanel,
  FeedsPanel,
  IdentityPanel,
  ItemsPanel,
  KeyringPanel,
  LoggingPanel,
  MembersPanel,
  NetworkPanel,
  SignalPanel,
  SpaceInfoPanel,
  SpacesPanel,
  StoragePanel,
  SwarmPanel,
} from '../panels';
import MetadataPanel from '../panels/echo/MetadataPanel';

export const namespace = 'devtools';

/**
 * Main app routes.
 * https://reactrouter.com/en/main
 */
export const useRoutes = () => {
  return useRouterRoutes([
    {
      path: '/',
      element: <RootContainer />,
      children: [
        {
          path: '/client',
          children: [
            {
              path: '/client/config',
              element: <ConfigPanel />,
            },
            {
              path: '/client/storage',
              element: <StoragePanel />,
            },
            {
              path: '/client/logs',
              element: <LoggingPanel />,
            },
            {
              path: '/client/diagnostics',
              element: <DiagnosticsPanel />,
            },
          ],
        },
        {
          path: '/halo',
          children: [
            {
              path: '/halo/identity',
              element: <IdentityPanel />,
            },
            {
              path: '/halo/keyring',
              element: <KeyringPanel />,
            },
            {
              path: '/halo/credentials',
              element: <CredentialsPanel />,
            },
          ],
        },
        {
          path: '/echo',
          children: [
            {
              path: '/echo/spaces',
              element: <SpacesPanel />,
            },
            {
              path: '/echo/space',
              element: <SpaceInfoPanel />,
            },
            {
              path: '/echo/feeds',
              element: <FeedsPanel />,
            },
            {
              path: '/echo/items',
              element: <ItemsPanel />,
            },
            {
              path: '/echo/members',
              element: <MembersPanel />,
            },
            {
              path: '/echo/metadata',
              element: <MetadataPanel />,
            },
          ],
        },
        {
          path: '/mesh',
          children: [
            {
              path: '/mesh/network',
              element: <NetworkPanel />,
            },
            {
              path: '/mesh/signal',
              element: <SignalPanel />,
            },
            {
              path: '/mesh/swarm',
              element: <SwarmPanel />,
            },
          ],
        },
      ],
    },
  ]);
};
