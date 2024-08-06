//
// Copyright 2024 DXOS.org
//

import { type Config } from '@dxos/config';
import { log } from '@dxos/log';
import { isNotNullOrUndefined } from '@dxos/util';

/**
 * @returns List of ICE servers provided by DXOS config merged with the ICE servers provided by IceProviders.
 */
export const getIceServers = async (config: Config): Promise<RTCIceServer[]> => {
  const iceProviders = config.get('runtime.services.iceProviders');
  const providedIceServers: RTCIceServer[] = [];

  if (iceProviders?.length && iceProviders.length > 0) {
    const responses = await Promise.all(
      iceProviders.map(({ urls }) =>
        fetch(urls, { method: 'GET' })
          .then((response) => response.json())
          .catch((err) => log.error('Failed to fetch ICE servers from provider', { urls, err })),
      ),
    );
    for (const { iceServers } of responses.filter(isNotNullOrUndefined)) {
      providedIceServers.push(...iceServers);
    }
  }

  const iceServers = [...config.get('runtime.services.ice', [])!, ...providedIceServers];
  log.info('ICE servers', { iceServers });

  return iceServers;
};
