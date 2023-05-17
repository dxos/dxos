//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { Device } from '@dxos/protocols/proto/dxos/client/services';

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
