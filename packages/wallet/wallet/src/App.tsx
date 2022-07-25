//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { AppLayout } from './containers';
import { InvitationPage, MainPage, PartyPage, RegistrationPage, RequireProfile } from './pages';

export const App = () => useRoutes([
  {
    path: '/register/*',
    element: <RegistrationPage />
  },
  {
    path: '/',
    element: <RequireProfile redirect='/register' />,
    children: [
      {
        path: '/invitation/:code',
        element: <InvitationPage />
      },
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { path: '/:party', element: <PartyPage /> },
          { path: '/', element: <MainPage /> }
        ]
      }]
  }
]);
