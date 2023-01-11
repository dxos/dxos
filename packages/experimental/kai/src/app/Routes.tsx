//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { InitPage, JoinPage, SettingsPage, SpacePage } from './pages';

export const matchSpaceKey = (spaces: Space[], spaceKey: string) =>
  spaces.find((space) => space.key.truncate() === spaceKey);

export const createSpacePath = (spaceKey: PublicKey, view?: string) =>
  `/${spaceKey.truncate()}` + (view ? `/${view}` : '');

/**
 * Main app routes.
 */
export const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <InitPage />
    },
    {
      path: '/settings',
      element: <SettingsPage />
    },
    {
      path: '/join/:invitation',
      element: <JoinPage />
    },
    {
      path: '/:spaceKey',
      element: <SpacePage />,
      children: [
        {
          path: '/:spaceKey/:view',
          element: <SpacePage />
        }
      ]
    }
  ]);
};
