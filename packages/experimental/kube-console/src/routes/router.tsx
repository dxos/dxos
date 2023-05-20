//
// Copyright 2023 DXOS.org
//

import type { Router } from '@remix-run/router';
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ModuleContainer, Root } from '../containers';

export const LandingPage = React.lazy(() => import('./Landing'));

export const createRouter = (): Router => {
  return createBrowserRouter([
    {
      path: '/',
      element: <Root />,
      children: [
        {
          path: '/',
          element: <LandingPage />,
        },
        {
          path: '/module/:module',
          element: <ModuleContainer />,
        },
      ],
    },
  ]);
};
