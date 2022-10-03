//
// Copyright 2022 DXOS.org
//

import React, { useRef } from 'react';
import { useRoutes, HashRouter } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import {
  AppLayout, AuthPage, DevicesPage, IdentityPage, InvitationPage, LockPage,
  RequireProfile, SpacePage, SpacesPage
} from './pages';

const configProvider = async () => new Config(await Dynamics(), Defaults());

const Routes = () => useRoutes([
  // TODO(wittjosiah): Move behind RequireProfile.
  {
    path: '/auth/:origin',
    element: <AuthPage />
  },
  {
    path: '/',
    element: <LockPage />
  },
  {
    path: '/',
    element: <RequireProfile redirect='/' />,
    children: [
      {
        path: '/invitation/:code',
        element: <InvitationPage />
      },
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { path: '/devices', element: <DevicesPage /> },
          { path: '/identity', element: <IdentityPage /> },
          { path: '/spaces', element: <SpacesPage /> },
          { path: '/spaces/:space', element: <SpacePage /> }
        ]
      }]
  }
]);

export const App = () => {
  const clientRef = useRef<Client>();

  return (
    <ErrorBoundary
      onError={() => !clientRef.current}
      onReset={async () => {
        await clientRef.current!.reset();
      }}
    >
      <ClientProvider
        clientRef={clientRef}
        config={configProvider}
      >
        <HashRouter>
          <Routes />
        </HashRouter>
      </ClientProvider>
    </ErrorBoundary>
  );
};
