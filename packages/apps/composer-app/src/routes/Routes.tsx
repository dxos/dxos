//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { PublicKey, Space } from '@dxos/client';
import { useTelemetry } from '@dxos/react-appkit';

import { DocumentLayout } from '../layouts';
import { DocumentPage, FirstRunPage } from '../pages';
import { ComposerDocument } from '../proto';

export const namespace = 'composer-app';

export const abbreviateKey = (key: PublicKey) => key.toHex().slice(0, 8);

export const findSpace = (spaces: Space[], spaceKey: string): Space | undefined =>
  spaces.find((space) => abbreviateKey(space.key) === spaceKey);

export const getPath = (space?: Space, doc?: ComposerDocument) => {
  return `/${[...(space ? [abbreviateKey(space.key)] : []), ...(doc ? [doc.id] : [])].join('/')}`;
};

export const Routes = () => {
  // TODO(wittjosiah): Settings to disable telemetry, sync from HALO?
  useTelemetry({ namespace });

  return useRoutes([
    {
      path: '/',
      element: <DocumentLayout />,
      children: [
        {
          path: '/',
          element: <FirstRunPage />
        },
        {
          path: '/:spaceKey/:docKey',
          element: <DocumentPage />
        }
      ]
    }
  ]);
};
