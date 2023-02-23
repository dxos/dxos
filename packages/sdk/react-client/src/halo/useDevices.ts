//
// Copyright 2020 DXOS.org
//

import { useMemo, useState, useSyncExternalStore } from 'react';

import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';

import { useClient } from '../client';

export const useDevices = (): DeviceInfo[] => {
  const client = useClient();
  const observable = useMemo(() => client.halo.queryDevices(), [client]);
  const [isLoading, setIsLoading] = useState(false);
  const devices =
    useSyncExternalStore(
      (listener) =>
        observable.subscribe({
          onUpdate: (devices) => {
            isLoading && setIsLoading(false);
            observable.setValue(devices);
            listener();
          },
          onError: () => {}
        }),
      () => observable.value
    ) ?? [];

  return devices;
};
