import React, { useEffect } from "react";
import { useRoutes } from 'react-router-dom';
import { SpacePage } from './pages';
import { useClient, useIdentity } from '@dxos/react-client';
import {
  AppLayout,
  ManageSpacePage,
  RequireIdentity,
  useTelemetry
} from '@dxos/react-appkit';
import {
  SpacesPage
} from "./pages/SpacesPage";

// import { LIST_TYPE } from '@dxos/react-list';
// import { ObjectModel, Space } from '@dxos/client';

export const Routes = () => {

  const client = useClient();
  const identity = useIdentity();
  
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace: 'tasks-app' });

  // Allow the client to auto-create an identity if env DX_VAULT=false
  useEffect(() => {
    if (process.env.DX_VAULT === 'false' && !identity) {
      void client.halo.createProfile();
    }
  }, []);

  if (process.env.DX_VAULT === 'false' && !identity) {
    return null;
  }

  return useRoutes([
    {
      path: '/',
      element: <RequireIdentity/>,
      children: [
        {
          path: '/',
          element: <AppLayout spacesPath='/' />,
          children: [
            {
              path: '/',
              element: <SpacesPage />
            },
            {
              path: '/spaces/:space',
              element: <SpacePage />
            },
            {
              path: '/spaces/:space/settings',
              element: <ManageSpacePage />
            }
          ]
        }
      ]
    }
  ]);
};