//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { RequireIdentity } from '@dxos/react-appkit';

import { SpacePage } from './pages/SpacePage';
import { SpacesPage } from './pages/SpacesPage';

export const Routes = () => {
  return useRoutes([
    {
      element: <RequireIdentity />,
      children: [
        {
          path: '/',
          element: <SpacesPage />
        },
        {
          path: '/spaces/:spaceId',
          element: <SpacePage />
        }
      ]
    }
  ]);
};
