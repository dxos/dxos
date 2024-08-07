//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { isNotNullOrUndefined } from '@dxos/util';

/**
 * @returns List of ICE servers provided by DXOS config merged with the ICE servers provided by IceProviders.
 */
export const getIceServers = async (iceProviders: Runtime.Services.IceProvider[]): Promise<RTCIceServer[]> =>
  (
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
