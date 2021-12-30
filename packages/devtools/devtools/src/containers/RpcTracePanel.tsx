import { useClient } from "@dxos/react-client";
import { JsonTreeView } from "@dxos/react-components";
import React, { useEffect, useState } from 'react';
import { Panel } from "../components";
import { MessageTrace } from "../proto/gen/dxos/rpc";
import { schema } from "../proto/gen";
import assert from "assert";
import { clientServiceBundle, ClientServices } from "@dxos/client";
import pb from 'protobufjs';

export const RpcTracePanel = () => {
  const client = useClient();
  const [messages, setMessages] = useState<unknown[]>([]);

  useEffect(() => {
    const stream = client.services.TracingService.SubscribeToRpcTrace();
    stream.subscribe(msg => setMessages(messages => [...messages, preprocessMessage(msg)]), () => {});

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

function preprocessMessage(msg: MessageTrace): unknown {
  assert(msg.data)
  const rpcData = schema.getCodecForType('dxos.rpc.RpcMessage').decode(msg.data);
  if (rpcData.request) {
    assert(rpcData.request.method);
    const method = getRpcMethodDef(rpcData.request.method);
    method.resolve();

    rpcData.request.payload
    const payload = schema.getCodecForType(method.resolvedRequestType!.fullName as any).decode(rpcData.request.payload!);

    return {
      direction: msg.direction === MessageTrace.Direction.INCOMING ? 'INCOMING' : 'OUTGOING',
      data: {
        ...rpcData,
        request: {
          ...rpcData.request,
          payload,
        },
      }
    }
  } else {
    return {
      direction: msg.direction === MessageTrace.Direction.INCOMING ? 'INCOMING' : 'OUTGOING',
      data: {
        ...rpcData,
      }
    }
  }
}

function getRpcMethodDef(method: string): pb.Method {
  const [service, methodName] = method.split('.');

  return clientServiceBundle[service as keyof ClientServices].serviceProto.methods[methodName];
}