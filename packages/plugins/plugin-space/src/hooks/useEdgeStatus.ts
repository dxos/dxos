//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { buf } from '@dxos/protocols/buf';
import {
  type EdgeStatus,
  EdgeStatus_ConnectionState,
  EdgeStatusSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { useClient } from '@dxos/react-client';

const NOT_CONNECTED: EdgeStatus = buf.create(EdgeStatusSchema, {
  state: EdgeStatus_ConnectionState.NOT_CONNECTED,
  rtt: 0,
  uptime: 0,
  rateBytesUp: 0,
  rateBytesDown: 0,
  messagesSent: 0,
  messagesReceived: 0,
});

/**
 * Subscribes to the EDGE connection status, which the client refreshes about once a second while connected.
 */
export const useEdgeStatus = (): EdgeStatus => {
  const client = useClient();
  const [status, setStatus] = useState<EdgeStatus>(NOT_CONNECTED);
  useEffect(() => {
    const stream = client.services.services.EdgeAgentService?.queryEdgeStatus();
    stream?.subscribe(
      ({ status }) => setStatus(status ?? NOT_CONNECTED),
      (err) => err && log.catch(err),
    );

    return () => {
      void stream?.close();
    };
  }, [client]);

  return status;
};
