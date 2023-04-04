//
// Copyright 2023 DXOS.org
//

import type { Router } from '@remix-run/router';
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { PublicKey, Space } from '@dxos/client';

import { Root } from './layouts';
import { DocumentPage, FirstRunPage } from './pages';

export const namespace = 'composer-app';

export const abbreviateKey = (key: PublicKey) => key.toHex().slice(0, 8);

export const findSpace = (spaces: Space[], spaceKey: string): Space | undefined =>
  spaces.find((space) => abbreviateKey(space.key) === spaceKey);

export const getPath = (spaceKey?: PublicKey, docId?: string) => {
  return `/${[...(spaceKey ? [abbreviateKey(spaceKey)] : []), ...(docId ? [docId] : [])].join('/')}`;
};

export const createRouter = (): Router =>
  createBrowserRouter([
    {
      path: '/',
      element: <Root />,
      children: [
        {
          path: '/',
          element: <FirstRunPage />
        },
        {
          path: '/:spaceKey',
          element: <FirstRunPage />
        },
        {
          path: '/:spaceKey/:docKey',
          element: <DocumentPage />
        }
      ]
    }
  ]);
