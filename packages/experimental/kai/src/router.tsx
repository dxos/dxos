//
// Copyright 2022 DXOS.org
//

import type { Router } from '@remix-run/router';
import React, { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Root } from './containers';
import { AppState } from './hooks';
import { IdentityPage, SettingsPage, SpacePage } from './pages';

/**
 * Main app routes.
 */
export const createRouter = (initialState: AppState = {}, children?: ReactNode): Router =>
  createBrowserRouter([
    {
      path: '/',
      element: <Root initialState={initialState}>{children}</Root>,
      children: [
        // TODO(wittjosiah): This is broken and should be integrated w/ shell.
        {
          path: '/identity',
          element: <IdentityPage />
        },
        {
          path: '/settings',
          element: <SettingsPage />
        },
        // TODO(wittjosiah): Factor out appbar to a layout.
        // TODO(wittjosiah): Use search params to reduce the number of routes?
        {
          path: '/:spaceKey',
          element: <SpacePage />
        },
        {
          path: '/:spaceKey/:section',
          element: <SpacePage />
        },
        {
          path: '/:spaceKey/:section/:frame',
          element: <SpacePage />
        },
        {
          path: '/:spaceKey/:section/:frame/:objectId',
          element: <SpacePage />
        },
        {
          path: '/',
          element: <SpacePage />
        }
      ]
    }
  ]);
