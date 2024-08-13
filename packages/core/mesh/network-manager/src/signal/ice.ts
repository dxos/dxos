//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { isNotNullOrUndefined } from '@dxos/util';

export interface IceProvider {
  getIceServers: () => Promise<RTCIceServer[]>;
}

export const createIceProvider = (iceProviders: Runtime.Services.IceProvider[]): IceProvider => {
  let cachedIceServers: RTCIceServer[];
  return {
    getIceServers: async () => {
      if (cachedIceServers) {
        return cachedIceServers;
      }

      cachedIceServers = (
        await Promise.all(
          iceProviders.map(({ urls }) =>
            fetch(urls, { method: 'GET' })
              .then((response) => response.json())
              .catch((err) => log.error('Failed to fetch ICE servers from provider', { urls, err })),
          ),
        )
      )
        .filter(isNotNullOrUndefined)
        .map(({ iceServers }: { iceServers: RTCIceServer[] }) => iceServers)
        .flat();

      return cachedIceServers;
    },
  };
};
