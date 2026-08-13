//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';

const NOT_CONNECTED: EdgeStatus = {
  state: EdgeStatus.ConnectionState.NOT_CONNECTED,
  rtt: 0,
  uptime: 0,
  rateBytesUp: 0,
  rateBytesDown: 0,
  messagesSent: 0,
  messagesReceived: 0,
};

/**
 * Subscribes to the EDGE connection status, which the client refreshes about once a second while connected.
 */
export const useEdgeStatus = (): EdgeStatus => {
  const client = useClient();
  const [status, setStatus] = useState<EdgeStatus>(NOT_CONNECTED);
  useEffect(() => {
    const stream = client.services.services.EdgeAgentService?.queryEdgeStatus();
    stream?.subscribe(
      ({ status }) => setStatus(status),
      (err) => err && log.catch(err),
    );

    return () => {
      void stream?.close();
    };
  }, [client]);

  return status;
};
