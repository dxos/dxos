//
// Copyright 2022 DXOS.org
//

import type { Router } from '@remix-run/router';
import React, { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { Invitation, InvitationEncoder, PublicKey } from '@dxos/client';

import { Root } from './containers';
import { AppState } from './hooks';
import { IdentityPage, SettingsPage, SpacePage } from './pages';

// TODO(burdon): Create defs/helpers for other routes.
export enum Section {
  REGISTRY = 'registry',
  SETTINGS = 'settings',
  FRAME = 'frame'
}

// TODO(burdon): Use FrameDef?
export const createSpacePath = (spaceKey?: PublicKey, frame?: string, objectId?: string) =>
  `/${spaceKey ? spaceKey.truncate() + (frame ? `/frame/${frame}` + (objectId ? `/${objectId}` : '') : '') : ''}`;

export const createSectionPath = (spaceKey?: PublicKey, section?: Section) =>
  `/${spaceKey ? spaceKey.truncate() + (section ? `/${section}` : '') : ''}`;

export const createInvitationPath = (invitation: Invitation) =>
  `/?spaceInvitationCode=${InvitationEncoder.encode(invitation)}`;

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
