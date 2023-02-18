//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes as useRouterRoutes } from 'react-router-dom';

import { RootContainer } from '../app';
import {
  ConfigPanel,
  CredentialsPanel,
  FeedsPanel,
  IdentityPanel,
  ItemsPanel,
  KeyringPanel,
  MembersPanel,
  SpacesPanel,
  SignalPanel,
  SwarmPanel
} from '../panels';

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
              element: <ConfigPanel />
            }
          ]
        },
        {
          path: '/halo',
          children: [
            {
              path: '/halo/identity',
              element: <IdentityPanel />
            },
            {
              path: '/halo/keyring',
              element: <KeyringPanel />
            },
            {
              path: '/halo/credentials',
              element: <CredentialsPanel />
            }
          ]
        },
        {
          path: '/echo',
          children: [
            {
              path: '/echo/spaces',
              element: <SpacesPanel />
            },
            {
              path: '/echo/feeds',
              element: <FeedsPanel />
            },
            {
              path: '/echo/items',
              element: <ItemsPanel />
            },
            {
              path: '/echo/members',
              element: <MembersPanel />
            }
          ]
        },
        {
          path: '/mesh',
          children: [
            {
              path: '/mesh/swarm',
              element: <SwarmPanel />
            },
            {
              path: '/mesh/signal',
              element: <SignalPanel />
            }
          ]
        }
      ]
    }
  ]);
};
