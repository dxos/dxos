//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HashRouter } from 'react-router-dom';

import { RoomContextProvider } from './RoomContextProvider';
import { useRoutes } from './useRoutes';

const Routes = () => {
  return useRoutes();
};
const queryClient = new QueryClient();

export type CallsProps = {
  roomName: string;
  iceServers: RTCIceServer[];
  noRouter?: boolean;
  username: string;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Calls = ({ roomName, noRouter, iceServers, username }: CallsProps) => {
  if (noRouter) {
    return <Routes />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RoomContextProvider roomName={roomName} iceServers={iceServers} username={username}>
        <HashRouter>
          <Routes />
        </HashRouter>
      </RoomContextProvider>
    </QueryClientProvider>
  );
};
