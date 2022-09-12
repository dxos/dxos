//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box } from '@mui/material';

import { SignalStatusComp, SignalTrace } from '@dxos/devtools-mesh';
import { useDevtools, useStream } from '@dxos/react-client';
import { SignalState, SignalStatus } from '@dxos/signaling';

import { SubscribeToSignalStatusResponse } from '../../proto';

const stringToState = (state: string): SignalState => {
  const dict: Record<string, SignalState> = {
    CONNECTING: SignalState.CONNECTING,
    RE_CONNECTING: SignalState.RE_CONNECTING,
    CONNECTED: SignalState.CONNECTED,
    DISCONNECTED: SignalState.DISCONNECTED,
    CLOSED: SignalState.CLOSED
  };
  return dict[state];
};

const signalStatus = (server: SubscribeToSignalStatusResponse.SignalServer): SignalStatus => {
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
        <SignalStatusComp status={servers.map(signalStatus)} />
      )}
      {events.length < 1 && (
        <SignalTrace trace={events?.map(event => JSON.parse(event))} />
      )}
    </Box>
  );
};
