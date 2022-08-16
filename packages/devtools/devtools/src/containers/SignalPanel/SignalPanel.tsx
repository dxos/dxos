//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box } from '@mui/material';

import { SignalStatus, SignalTrace } from '@dxos/devtools-mesh';
import { State, Status } from '@dxos/network-manager';
import { useDevtools, useStream } from '@dxos/react-client';

import { SubscribeToSignalStatusResponse } from '../../proto';

const stringToState = (state: string): State => {
  const dict: Record<string, State> = {
    CONNECTING: State.CONNECTING,
    RE_CONNECTING: State.RE_CONNECTING,
    CONNECTED: State.CONNECTED,
    DISCONNECTED: State.DISCONNECTED,
    CLOSED: State.CLOSED
  };
  return dict[state];
};

const signalStatus = (server: SubscribeToSignalStatusResponse.SignalServer): Status => {
  return {
    connectionStarted: server.connectionStarted!,
    lastStateChange: server.lastStateChange!,
    reconnectIn: server.reconnectIn!,
    host: server.host!,
    state: stringToState(server.state!)
  };
};

export const SignalPanel = () => {
  const devtoolsHost = useDevtools();
  const { servers } = useStream(() => devtoolsHost.subscribeToSignalStatus(), {});
  const { events } = useStream(() => devtoolsHost.subscribeToSignalTrace(), {});
  if (!servers || !events) {
    return null;
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      padding: 1,
      overflow: 'hidden',
      overflowY: 'auto',
      overflowX: 'auto'
    }}>
      {servers.length >= 1 && (
        <SignalStatus status={servers.map(signalStatus)} />
      )}
      {events.length < 1 && (
        <SignalTrace trace={events?.map(event => JSON.parse(event))} />
      )}
    </Box>
  );
};
