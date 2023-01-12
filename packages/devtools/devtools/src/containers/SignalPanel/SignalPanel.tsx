//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Box } from '@mui/material';

import { SignalStatusComp } from '@dxos/devtools-mesh';
import { SignalState, SignalStatus } from '@dxos/messaging';
import { SignalResponse, SubscribeToSignalStatusResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components-deprecated';

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
  if (!devtoolsHost) {
    return null;
  }

  const { servers } = useStream(() => devtoolsHost.subscribeToSignalStatus(), {});
  const [signalResponses, setSignalResponses] = useState<SignalResponse[]>([]);

  useEffect(() => {
    const signalOutput = devtoolsHost.subscribeToSignal();
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: SignalResponse) => {
      signalResponses.push(response);
      setSignalResponses([...signalResponses]);
    });

    return () => {
      signalOutput.close();
    };
  }, []);

  if (!servers) {
    return null;
  }

  return (
    <div className='flex flex-col flex-1 overflow-auto'>
      <div className='flex m-2'>{servers.length >= 1 && <SignalStatusComp status={servers.map(signalStatus)} />}</div>
      <div className='flex m-2'>
        <JsonTreeView data={signalResponses} />
      </div>
    </div>
  );
};
