//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { Panel } from '../../components';
import { RpcMessage } from '../../proto/gen/dxos/rpc';

export const RpcTracePanel = () => {
  const client = useClient();
  const [messages, setMessages] = useState<RpcMessage[]>([]);

  useEffect(() => {
    const stream = client.services.TracingService.subscribeToRpcTrace();
    stream.subscribe(msg => setMessages(messages => [...messages, msg]), () => {});

    return () => stream.close();
  }, [client]);

  return (
    <Panel>
      {messages.map((msg, idx) => (
        <JsonTreeView data={msg} key={idx} />
      ))}
    </Panel>
  );
};
