//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

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
import { RootContainer } from './RootContainer';

// https://github.com/remix-run/react-router/blob/main/docs/start/tutorial.md

export const Routes = () => {
  return useRoutes([
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
