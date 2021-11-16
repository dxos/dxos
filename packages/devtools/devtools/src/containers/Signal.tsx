//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import React from 'react';

import { createTheme } from '@mui/material';
import { makeStyles } from '@mui/styles';

// code import { PeerGraph } from '@dxos/devtools-mesh';
import { SignalStatus, SignalTrace } from '@dxos/devtools-mesh';
import { SignalApi } from '@dxos/network-manager';

import { useDevtoolsHost } from '../contexts';
import { useStream } from '../hooks';
import { SubscribeToSignalStatusResponse } from '../proto';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    padding: theme.spacing(2),
    overflowY: 'auto',
    overflowX: 'auto'
  },

  filter: {
    display: 'flex',
    flexShrink: 0,
    padding: theme.spacing(1),
    paddingTop: theme.spacing(2)
  },

  graph: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  }
}), { defaultTheme: createTheme({}) });

const stringToState = (state: string): SignalApi.State => {
  const dict: Record<string, SignalApi.State> = {
    CONNECTING: SignalApi.State.CONNECTING,
    RE_CONNECTING: SignalApi.State.RE_CONNECTING,
    CONNECTED: SignalApi.State.CONNECTED,
    DISCONNECTED: SignalApi.State.DISCONNECTED,
    CLOSED: SignalApi.State.CLOSED
  };
  return dict[state];
};

const signalStatus = (server: SubscribeToSignalStatusResponse.SignalServer): SignalApi.Status => {
  assert(server.connectionStarted && server.host && server.lastStateChange && server.reconnectIn && server.state);
  return {
    connectionStarted: server.connectionStarted!,
    lastStateChange: server.lastStateChange!,
    reconnectIn: server.reconnectIn!,
    host: server.host!,
    state: stringToState(server.state!)
  };
};

export const Signal = () => {
  const classes = useStyles();
  const devtoolsHost = useDevtoolsHost();
  const status = useStream(() => devtoolsHost.SubscribeToSignalStatus());
  const trace = useStream(() => devtoolsHost.SubscribeToSignalTrace());

  if (!status?.servers) {
    return <div>Loading servers status...</div>;
  }

  if (!trace?.events) {
    return <div>Loading trace...</div>;
  }

  return (
    <div className={classes.root}>
      {status?.servers.length < 1 ? (
        <div>Status unknown.</div>
      ) : (
        <SignalStatus status={status.servers.map(signalStatus)} />
      )}
      {trace.events.length < 1 ? (
        <SignalTrace trace={trace?.events?.map(event => JSON.parse(event))} />
      ) : (
        <div>No signal trace.</div>
      )}
    </div>
  );
};
