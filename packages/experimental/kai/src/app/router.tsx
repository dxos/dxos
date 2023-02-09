//
// Copyright 2022 DXOS.org
//

import type { Router } from '@remix-run/router';
import React, { ReactNode } from 'react';
import { createBrowserRouter, generatePath } from 'react-router-dom';

import { Invitation } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client-services';
import { PublicKey } from '@dxos/keys';

import { AppState } from '../hooks';
import { IdentityPage, SettingsPage, SpacePage } from '../pages';
import { Root } from './Root';

export const createSpacePath = (spaceKey?: PublicKey, frame?: string) =>
  !spaceKey
    ? '/'
    : !frame
    ? generatePath('/:spaceKey', { spaceKey: spaceKey.truncate() })
    : generatePath('/:spaceKey/:frame', {
        spaceKey: spaceKey.truncate(),
        frame
      });

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
        {
          path: '/:spaceKey',
          element: <SpacePage />
        },
        {
          path: '/:spaceKey/:frame',
          element: <SpacePage />
        },
        {
          path: '/',
          element: <SpacePage />
        }
      ]
    }
  ]);
