//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { SignalApi } from '@dxos/network-manager';

const getColor = (state: SignalApi.State) => {
  switch (state) {
    case SignalApi.State.CONNECTING:
    case SignalApi.State.RE_CONNECTING:
      return 'orange';
    case SignalApi.State.CONNECTED:
      return 'green';
    case SignalApi.State.DISCONNECTED:
      return 'red';
    case SignalApi.State.CLOSED:
      return 'darkgray';
  }
};

export interface SignalStatusProps {
  status: SignalApi.Status[]
}

export const SignalStatus = ({ status }: SignalStatusProps) => {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // TODO(burdon): Use format tool (mins, sec, etc.)
  const format = (n: number, unit = 's') => `${n.toLocaleString()}${unit}`;

  return (
    <div>
      {status.map(status => (
        <div
          style={{
            color: getColor(status.state)
          }}
          key={status.host}
        >
          {status.host} {status.state}
          {status.error && <div>{status.error}</div>}
          {status.state === SignalApi.State.DISCONNECTED &&
            <div>Will reconnect in {format(Math.floor((status.lastStateChange + status.reconnectIn - time) / 1000))}</div>}
          {status.state === SignalApi.State.CONNECTED &&
            <div>Connected for {format(Math.floor((time - status.connectionStarted) / 1000))}</div>}
        </div>
      ))}
    </div>
  );
};
