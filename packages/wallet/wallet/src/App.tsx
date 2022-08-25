//
// Copyright 2022 DXOS.org
//

import React, { useRef } from 'react';
import { useRoutes, HashRouter } from 'react-router-dom';

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { ActionProvider, AppLayout } from './containers';
import {
  InvitationPage, MainPage, PartyPage, ProfilePage, RegistrationPage, RequireProfile
} from './pages';

const configProvider = async () => new Config(await Dynamics(), Defaults());

const Routes = () => useRoutes([
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
          { path: '/profile', element: <ProfilePage /> },
          { path: '/:party', element: <PartyPage /> },
          { path: '/', element: <MainPage /> }
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
        // TODO(wittjosiah): Why does it take so long for the client to initialize in prod build?
        options={{ timeout: 30000 }}
      >
        <ActionProvider>
          <HashRouter>
            <Routes />
          </HashRouter>
        </ActionProvider>
      </ClientProvider>
    </ErrorBoundary>
  );
};
