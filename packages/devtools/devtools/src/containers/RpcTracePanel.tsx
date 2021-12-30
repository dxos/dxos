import { useClient } from "@dxos/react-client";
import { JsonTreeView } from "@dxos/react-components";
import React, { useEffect, useState } from 'react';
import { Panel } from "../components";
import { MessageTrace } from "../proto/gen/dxos/rpc";

export const RpcTracePanel = () => {
  const client = useClient();
  const [messages, setMessages] = useState<MessageTrace[]>([]);

  useEffect(() => {
    const stream = client.services.TracingService.SubscribeToRpcTrace();
    stream.subscribe(msg => setMessages(messages => [...messages, msg]), () => {});

    return () => stream.close();
  }, [client]);

  return (
    <Panel>
      {messages.map((msg, idx) => (
        <JsonTreeView data={msg} key={idx} />
      ))}
    </Panel>
  )
}