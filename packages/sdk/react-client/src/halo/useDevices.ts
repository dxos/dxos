//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';
import { useAsyncEffect } from '@dxos/react-async';

import { useClient } from '../client';

export const useDevices = (): DeviceInfo[] => {
  const client = useClient();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useAsyncEffect(async () => {
    const result = await client.halo.queryDevices();
    setDevices(result);

    // TODO(wittjosiah): Make reactive.
    //   return result.subscribe((value) => {
    //     setDevices(value);
    //   });
  }, [client]);

  return devices;
};
