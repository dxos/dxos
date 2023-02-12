//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { Invitation, InvitationEncoder } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { RequireIdentity } from '@dxos/react-appkit';

import {
  CreateIdentityPage,
  IdentityPage,
  InitPage,
  JoinIdentityPage,
  JoinSpacePage,
  RecoverIdentityPage,
  SettingsPage,
  SpacePage
} from '../pages';

// TODO(burdon): Create defs/helpers for other routes.
export enum Section {
  REGISTRY = 'registry',
  SETTINGS = 'settings'
}

// TODO(burdon): Use FrameDef?
export const createSpacePath = (spaceKey: PublicKey, frame?: string, objectId?: string) =>
  `/${spaceKey.truncate()}` + (frame ? `/frame/${frame}` + (objectId ? `/${objectId}` : '') : '');

export const createSectionPath = (spaceKey: PublicKey, section: Section) => `/${spaceKey.truncate()}/${section}`;

export const createInvitationPath = (invitation: Invitation) =>
  `/space/join?invitation=${InvitationEncoder.encode(invitation)}`;

/**
 * Main app routes.
 */
export const useAppRoutes = () =>
  useRoutes([
    {
      path: '/',
      element: <InitPage />
    },
    {
      path: '/identity/create',
      element: <CreateIdentityPage />
    },
    {
      path: '/identity/recover',
      element: <RecoverIdentityPage />
    },
    {
      path: '/identity/join',
      element: <JoinIdentityPage />
    },
    {
      path: '/',
      element: <RequireIdentity redirect='/' />,
      children: [
        // TODO(wittjosiah): Factor out appbar to a layout.
        {
          path: '/identity',
          element: <IdentityPage />
        },
        {
          path: '/settings',
          element: <SettingsPage />
        },
        {
          path: '/space/join',
          element: <JoinSpacePage />
        },
        {
          path: '/:spaceKey',
          element: <SpacePage />,
          children: [
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
            }
          ]
        }
      ]
    }
  ]);
