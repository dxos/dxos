//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { useTelemetry } from '@dxos/react-appkit';

import { DocumentLayout } from './layouts';
import { DocumentPage } from './pages';

export const namespace = 'composer-app';

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
          element: <DocumentPage />
        }
      ]
    }
  ]);
};
