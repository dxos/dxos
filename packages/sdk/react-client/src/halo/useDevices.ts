//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import type { Device } from '@dxos/client/halo';

import { useClient } from '../client';

export const useDevices = (): Device[] => {
  const client = useClient();
  const devices = useSyncExternalStore(
    (listener) => {
      const subscription = client.halo.devices.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => client.halo.devices.get(),
  );

  return devices;
};
