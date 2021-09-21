//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';

import { ServiceDescriptor } from '@dxos/codec-protobuf';
import { RpcPort, ProtoRpcClient, createRpcClient } from '@dxos/rpc';

interface UseRpcClientProps<S> {
  port: RpcPort,
  service: ServiceDescriptor<S>,
  timeout?: number | undefined,
}

export const useRpcClient = <S>({ port, service, timeout } : UseRpcClientProps<S>) => {
  const [error, setError] = useState<Error | undefined>(undefined);
  const [rpcClient, setRpcClient] = useState<ProtoRpcClient<S> | undefined>(undefined);

  useEffect(() => {
    let client: ProtoRpcClient<S>;
    try {
      client = createRpcClient(service, {
        port: port,
        timeout
      });
    } catch (err: any) {
      console.error('Creating RPC client failed', err);
      setError(err);
      return;
    }

    setImmediate(async () => {
      try {
        await client.open();
        setRpcClient(client);
      } catch (err: any) {
        console.error('Opening RPC client failed', err);
        setError(err);
      }
    });

    // TODO: Make sure close is not called before open is finished (maybe put @synchronized in RPC client?).
    return () => {
      client.close();
    };
  }, []);

  return { error, rpcClient };
};
