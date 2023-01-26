//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';

import { ManageSpacePage, RequireIdentity, SpacesPage, useTelemetry } from '@dxos/react-appkit';
import { useClient, useIdentity } from '@dxos/react-client';

import { SpaceLayout, SpaceSettingsLayout, SpacesLayout } from './layouts';
import { SpacePage } from './pages';

export const Routes = () => {
  const client = useClient();
  const identity = useIdentity();

  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace: 'braneframe-app' });

  const routes = useRoutes([
    {
      path: '/',
      element: <RequireIdentity />,
      children: [
        {
          path: '/',
          element: <SpacesLayout />,
          children: [
            {
              path: '/',
              element: <SpacesPage />
            }
          ]
        },
        {
          path: '/spaces/:space',
          element: <SpaceLayout />,
          children: [
            {
              path: '/spaces/:space',
              element: <SpacePage />
            }
          ]
        },
        {
          path: '/spaces/:spaceKey/settings',
          element: <SpaceSettingsLayout />,
          children: [
            {
              path: '/spaces/:spaceKey/settings',
              element: <ManageSpacePage />
            }
          ]
        }
      ]
    }
  ]);

  // Allow the client to auto-create an identity if env DX_VAULT=false
  useEffect(() => {
    if (process.env.DX_VAULT === 'false' && !identity) {
      void client.halo.createProfile();
    }
  }, []);

  if (process.env.DX_VAULT === 'false' && !identity) {
    return null;
  }

  return routes;
};
