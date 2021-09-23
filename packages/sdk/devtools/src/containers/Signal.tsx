//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core';

// import { PeerGraph } from '@dxos/network-devtools';
import { SignalStatus, SignalTrace } from '@dxos/network-devtools';
import { SignalApi } from '@dxos/network-manager';

import { useDevtoolsHost } from '../contexts';
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
}));

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
    connectionStarted: +(server.connectionStarted!.seconds! + '000'),
    lastStateChange: +(server.lastStateChange!.seconds! + '000'),
    reconnectIn: server.reconnectIn!,
    host: server.host!,
    state: stringToState(server.state!)
  };
};

export default function Signal () {
  const classes = useStyles();
  const devtoolsHost = useDevtoolsHost();
  const [status, setStatus] = useState<SignalApi.Status[]>([]);
  const [trace, setTrace] = useState<SignalApi.CommandTrace[]>([]);

  useEffect(() => {
    const stream = devtoolsHost.SubscribeToSignalStatus({});
    stream?.subscribe(msg => msg.servers && setStatus(msg.servers.map(signalStatus)), () => {});
    return stream?.close;
  }, []);

  useEffect(() => {
    const stream = devtoolsHost.SubscribeToSignalTrace({});
    stream?.subscribe((msg) => msg.events && setTrace(msg.events.map(event => JSON.parse(event))), () => {});
    return stream?.close;
  }, []);

  return (
    <div className={classes.root}>
      {status.length < 1
        ? (
        <p>Status unknown.</p>
          )
        : (
        <SignalStatus status={status} />
          )}
      <SignalTrace trace={trace} />
    </div>
  );
}
