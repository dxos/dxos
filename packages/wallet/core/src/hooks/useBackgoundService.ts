//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

import { useRpcClient } from '.';
import { schema } from '../proto/gen';

interface UseBackgroundServiceProps {
  port: RpcPort
}

export const useBackgroundService = ({ port } : UseBackgroundServiceProps) => {
  return useRpcClient({ port, service: schema.getService('dxos.wallet.extension.BackgroundService') });
};
