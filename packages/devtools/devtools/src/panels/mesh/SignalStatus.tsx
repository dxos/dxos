//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
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
  const { servers } = useStream(() => devtoolsHost.subscribeToSignalStatus(), { servers: [] });
  const status = servers!.map(getSignalStatus);

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        setTime(new Date());
      },
      1000
    );
    return () => {
      void ctx.dispose();
    };
  }, []);

  const formatDate = (milliseconds: number) => new Date(milliseconds).toISOString().split('T')[1].split('Z')[0];

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
              Will reconnect in {formatDate(status.lastStateChange.getTime() + status.reconnectIn - time.getTime())}
            </div>
          )}
          {status.state === SignalState.CONNECTED && (
            <div>Connected for {formatDate(time.getTime() - status.lastStateChange.getTime())}</div>
          )}
        </div>
      ))}
    </div>
  );
};
