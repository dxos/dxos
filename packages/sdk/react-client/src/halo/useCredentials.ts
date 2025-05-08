//
// Copyright 2020 DXOS.org
//

import type { Credential } from '@dxos/client/halo';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client';

export const useCredentials = (): Credential[] => {
  const client = useClient();
  return useMulticastObservable(client.halo.credentials);
};
