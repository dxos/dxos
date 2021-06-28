//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';
import { schema } from '../proto/gen';
import { useRpcClient } from '.';

interface UseBackgroundServiceProps {
  port: RpcPort
}

export const useBackgroundService = ({ port } : UseBackgroundServiceProps) => {
  const backgroundService = useRpcClient({ port, service: schema.getService('dxos.wallet.extension.BackgroundService') });
  return backgroundService;
};
