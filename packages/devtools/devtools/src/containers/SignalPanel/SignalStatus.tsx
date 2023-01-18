//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { SignalState, SignalStatus } from '@dxos/messaging';
import { SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client';

const getColor = (state: SignalState) => {
  switch (state) {
    case SignalState.CONNECTING:
    case SignalState.RE_CONNECTING:
      return 'orange';
    case SignalState.CONNECTED:
      return 'green';
    case SignalState.DISCONNECTED:
      return 'red';
    case SignalState.CLOSED:
      return 'darkgray';
  }
};

export interface SignalStatusProps {
  status: SignalStatus[];
}

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

const getSignalStatus = (server: SubscribeToSignalStatusResponse.SignalServer): SignalStatus => {
  return {
    connectionStarted: server.connectionStarted!,
    lastStateChange: server.lastStateChange!,
    reconnectIn: server.reconnectIn!,
    host: server.host!,
    state: stringToState(server.state!)
  };
};

export const SignalStatusComp = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }
  const { servers } = useStream(() => devtoolsHost.subscribeToSignalStatus(), { servers: [] });
  const status = servers!.map(getSignalStatus);

  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // TODO(burdon): Use format tool (mins, sec, etc.)
  const format = (n: number, unit = 's') => `${n.toLocaleString()}${unit}`;

  if (!servers) {
    return null;
  }

  return (
    <div>
      {status.map((status) => (
        <div
          style={{
            color: getColor(status.state)
          }}
          key={status.host}
        >
          {status.host} {status.state}
          {status.error && <div>{status.error}</div>}
          {status.state === SignalState.DISCONNECTED && (
            <div>
              Will reconnect in {format(Math.floor((status.lastStateChange + status.reconnectIn - time) / 1000))}
            </div>
          )}
          {status.state === SignalState.CONNECTED && (
            <div>Connected for {format(Math.floor((time - status.connectionStarted) / 1000))}</div>
          )}
        </div>
      ))}
    </div>
  );
};
