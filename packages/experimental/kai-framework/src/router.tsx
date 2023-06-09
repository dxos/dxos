//
// Copyright 2022 DXOS.org
//

import type { Router } from '@remix-run/router';
import React, { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Root } from './containers';
import { AppState } from './hooks';
import { SettingsPage, SpacePage } from './pages';

/**
 * Main app routes.
 */
export const createRouter = (initialState: Partial<AppState> = {}, children?: ReactNode): Router =>
  createBrowserRouter([
    {
      path: '/',
      element: <Root initialState={initialState}>{children}</Root>,
      children: [
        {
          path: '/settings',
          element: <SettingsPage />,
        },
        {
          path: '/:spaceKey',
          element: <SpacePage />,
        },
        {
          path: '/:spaceKey/:section',
          element: <SpacePage />,
        },
        {
          path: '/:spaceKey/:section/:frame',
          element: <SpacePage />,
        },
        {
          path: '/:spaceKey/:section/:frame/:objectId',
          element: <SpacePage />,
        },
        {
          path: '/',
          element: <SpacePage />,
        },
      ],
    },
  ]);
