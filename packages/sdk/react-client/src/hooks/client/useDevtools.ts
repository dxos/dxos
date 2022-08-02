//
// Copyright 2022 DXOS.org
//

import { DevtoolsHost } from '@dxos/client-protocol';

import { useClient } from '../client';

export const useDevtools = (): DevtoolsHost => {
  const client = useClient();
  return client.services.DevtoolsHost;
};
