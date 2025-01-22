//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HashRouter, useRoutes as useRouterRoutes } from 'react-router-dom';

import { type PublicKey } from '@dxos/react-client';

import { Lobby } from './Lobby';
import { Room } from './Room';
import { RoomContextProvider } from './RoomContextProvider';

const Routes = () => {
  return useRouterRoutes([
    {
      path: '/',
      element: <Lobby />,
    },
    {
      path: '/room',
      element: <Room />,
    },
  ]);
};
const queryClient = new QueryClient();

export type CallsProps = {
  roomId: PublicKey;
  iceServers: RTCIceServer[];
  username: string;
  noRouter?: boolean;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls = ({ roomId, noRouter, iceServers, username }: CallsProps) => {
  if (noRouter) {
    return <Routes />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RoomContextProvider roomId={roomId} iceServers={iceServers} username={username}>
        <HashRouter>
          <Routes />
        </HashRouter>
      </RoomContextProvider>
    </QueryClientProvider>
  );
};
