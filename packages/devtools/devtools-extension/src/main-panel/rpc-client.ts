//
// Copyright 2021 DXOS.org
//

import { DevtoolsHost, schema } from '@dxos/devtools';
import { createRpcClient, RpcPort } from '@dxos/rpc';

export const createDevtoolsRpc = async (port: RpcPort): Promise<DevtoolsHost> => {
  const service = schema.getService('dxos.devtools.DevtoolsHost');
  const rpcClient = createRpcClient(service, { port });
  await rpcClient.open();
  return rpcClient.rpc;
};
