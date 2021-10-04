//
// Copyright 2020 DXOS.org
//

import { createTheme } from '@mui/material';
import { makeStyles } from '@mui/styles';
import assert from 'assert';
import React from 'react';

// import { PeerGraph } from '@dxos/network-devtools';
import { SignalStatus, SignalTrace } from '@dxos/network-devtools';
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
    fontSize: '1.5em',
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

export default function Signal () {
  const classes = useStyles();
  const devtoolsHost = useDevtoolsHost();
  const status = useStream(() => devtoolsHost.SubscribeToSignalStatus({}));
  const trace = useStream(() => devtoolsHost.SubscribeToSignalTrace({}));

  if (!status?.servers) {
    return <div> Loading servers statuses... </div>;
  }

  if (!trace?.events) {
    return <div> Loading trace... </div>;
  }

  return (
    <div className={classes.root}>
      {status?.servers.length < 1
        ? (
        <p>Status unknown.</p>
          )
        : (
        <SignalStatus status={status.servers.map(signalStatus)} />
          )}
      {trace.events.length < 1 ? <SignalTrace trace={trace?.events?.map(event => JSON.parse(event))} /> : <div> No signal trace. </div>}
    </div>
  );
}
