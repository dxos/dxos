//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';

import { ManageSpacePage, RequireIdentity, useTelemetry } from '@dxos/react-appkit';
import { useClient, useIdentity } from '@dxos/react-client';

import { SpacesLayout, SpaceLayout, SpaceSettingsLayout } from './layouts';
import { SpacePage, SpacesPage } from './pages';

export const Routes = () => {
  const client = useClient();
  const identity = useIdentity();

  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace: 'tasks-app' });

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
          path: '/spaces/:spaceKey',
          element: <SpaceLayout />,
          children: [
            {
              path: '/spaces/:spaceKey',
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
