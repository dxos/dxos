//
// Copyright 2020 DXOS.org
//

import type { Device } from '@dxos/client/halo';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client';

export const useDevices = (): Device[] => {
  const client = useClient();
  return useMulticastObservable(client.halo.devices);
};
