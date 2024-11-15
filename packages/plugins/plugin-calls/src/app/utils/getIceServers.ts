//
// Copyright 2024 DXOS.org
//

import { type Config } from '@dxos/client';
import { createIceProvider } from '@dxos/network-manager';

export const getIceServers = async (config: Config): Promise<RTCIceServer[]> => {
  const iceServers: RTCIceServer[] = config.get('runtime.services.ice') ?? [];
  if (config.get('runtime.services.iceProviders')) {
    const provided = await createIceProvider(config.get('runtime.services.iceProviders')!).getIceServers();
    iceServers.push(...provided);
  }

  return iceServers;
};
