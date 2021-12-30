import { useClient } from "@dxos/react-client";
import { JsonTreeView } from "@dxos/react-components";
import React, { useEffect, useState } from 'react';
import { Panel } from "../components";
import { MessageTrace, RpcMessage } from "../proto/gen/dxos/rpc";
import { schema } from "../proto/gen";
import assert from "assert";
import { clientServiceBundle, ClientServices } from "@dxos/client";
import pb from 'protobufjs';

export const RpcTracePanel = () => {
  const client = useClient();
  const [messages, setMessages] = useState<RpcMessage[]>([]);

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
