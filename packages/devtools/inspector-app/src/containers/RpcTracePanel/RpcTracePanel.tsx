//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { RpcMessage } from '@dxos/protocols/proto/dxos/rpc';
import { useClient, useClientServices } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { Panel } from '../../components';

export const RpcTracePanel = () => {
  const client = useClient();
  const [messages, setMessages] = useState<RpcMessage[]>([]);
  const services = useClientServices();
  if (!services) {
    return null;
  }

  useEffect(() => {
    const stream = services.TracingService.subscribeToRpcTrace();
    stream.subscribe(
      (msg: any) => setMessages((messages) => [...messages, msg]),
      () => {}
    );

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
