//
// Copyright 2022 DXOS.org
//

import { raise } from '@dxos/debug';
import { type Rpc } from '@dxos/protocols';
import { type DevtoolsHost } from '@dxos/protocols/buf/dxos/devtools/host_pb';

import { useClient } from '../client';

/**
 * Returns the DevtoolsHost service from the client.
 */
export const useDevtools = (): Rpc.BufRpcClient<typeof DevtoolsHost> => {
  const client = useClient();
  return (client.services.services.DevtoolsHost ?? raise(new Error('DevtoolsHost not available.'))) as Rpc.BufRpcClient<
    typeof DevtoolsHost
  >;
};
