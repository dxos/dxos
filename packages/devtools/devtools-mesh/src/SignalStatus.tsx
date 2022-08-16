//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { State, Status } from '@dxos/network-manager';

const getColor = (state: State) => {
  switch (state) {
    case State.CONNECTING:
    case State.RE_CONNECTING:
      return 'orange';
    case State.CONNECTED:
      return 'green';
    case State.DISCONNECTED:
      return 'red';
    case State.CLOSED:
      return 'darkgray';
  }
};

export interface SignalStatusProps {
  status: Status[]
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
          {status.state === State.DISCONNECTED &&
            <div>Will reconnect in {format(Math.floor((status.lastStateChange + status.reconnectIn - time) / 1000))}</div>}
          {status.state === State.CONNECTED &&
            <div>Connected for {format(Math.floor((time - status.connectionStarted) / 1000))}</div>}
        </div>
      ))}
    </div>
  );
};
