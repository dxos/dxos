//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { RpcPort, ProtoRpcClient, createRpcClient } from '@dxos/rpc';

interface UseRpcClientProps<S> {
  port: RpcPort,
  service: ServiceDescriptor<S>
}

export const useRpcClient = <S>({ port, service } : UseRpcClientProps<S>) => {
  const [rpcClient, setRpcClient] = useState<ProtoRpcClient<S> | undefined>(undefined);

  useEffect(() => {
    const client = createRpcClient(service, {
      port: port
    });

    setImmediate(async () => {
      await client.open();
      setRpcClient(client);
    });

    // TODO: Make sure close is not called before open is finished (maybe put @synchronized in RPC client?).
    return () => {
      client.close();
    };
  }, []);

  return rpcClient;
};
