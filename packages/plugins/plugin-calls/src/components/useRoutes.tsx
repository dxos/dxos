//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useRoutes as useRouterRoutes } from 'react-router-dom';

import { Lobby } from './Lobby';
import Room from './Room';

export const namespace = 'devtools';

/**
 * Main app routes.
 * https://reactrouter.com/en/main
 */
export const useRoutes = () => {
  return useRouterRoutes([
    {
      path: '/',
      element: <Lobby />,
    },
    {
      path: '/room',
      element: <Room />,
    },
  ]);
};
