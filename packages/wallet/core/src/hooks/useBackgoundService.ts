//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

import { useRpcClient } from '.';
import { schema } from '../proto/gen';

interface UseBackgroundServiceProps {
  port: RpcPort,
  timeout?: number | undefined,
}

export const useBackgroundService = ({ port, timeout } : UseBackgroundServiceProps) => {
  return useRpcClient({
    port,
    service: schema.getService('dxos.wallet.extension.BackgroundService'),
    timeout
  });
};
