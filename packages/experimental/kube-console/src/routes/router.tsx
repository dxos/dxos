//
// Copyright 2023 DXOS.org
//

import type { Router } from '@remix-run/router';
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Root } from '../containers';

export const LandingPage = React.lazy(() => import('./Landing'));
export const StatusPage = React.lazy(() => import('./Status'));

export const createRouter = (): Router => {
  return createBrowserRouter([
    {
      path: '/',
      element: <Root />,
      children: [
        {
          path: '/about',
          element: <LandingPage />
        },
        {
          path: '/status',
          element: <StatusPage />
        },
        {
          path: '/',
          element: <LandingPage />
        }
      ]
    }
  ]);
};
