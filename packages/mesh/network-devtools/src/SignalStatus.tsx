//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { SignalApi } from '@dxos/network-manager';

export interface SignalStatusProps {
  status: SignalApi.Status[]
}

export const SignalStatus = ({ status }: SignalStatusProps) => {
  const [time, setTime] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ul>
      {status.map(s => (
        <li
          style={{
            color: getColor(s.state)
          }}
          key={s.host}
        >
          {s.host} {s.state}
          {s.error && <div>{s.error}</div>}
          {s.state === SignalApi.State.DISCONNECTED && <div>Will reconnect in {Math.floor((s.lastStateChange + s.reconnectIn - time) / 1000)} s</div>}
          {s.state === SignalApi.State.CONNECTED && <div>Connected for {Math.floor((time - s.connectionStarted) / 1000)} s</div>}
        </li>
      ))}
    </ul>
  );
};

function getColor (state: SignalApi.State) {
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
}
