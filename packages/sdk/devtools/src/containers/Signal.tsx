//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core';

// import { PeerGraph } from '@dxos/network-devtools';
import { SignalStatus, SignalTrace } from '@dxos/network-devtools';
import { SignalApi } from '@dxos/network-manager';

import { useAsyncEffect } from '../hooks/async-effect';
import { useBridge } from '../hooks/bridge';

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

export default function Signal () {
  const classes = useStyles();
  const [bridge] = useBridge();
  const [status, setStatus] = useState<SignalApi.Status[]>([]);
  const [trace, setTrace] = useState<SignalApi.CommandTrace[]>([]);

  useAsyncEffect(async () => {
    const stream = await bridge.openStream('network.signal.status');
    stream.onMessage(data => setStatus(data));
    return () => stream.close();
  }, [bridge]);

  useAsyncEffect(async () => {
    const stream = await bridge.openStream('network.signal.trace');
    stream.onMessage(data => setTrace(data));
    return () => stream.close();
  }, [bridge]);

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
