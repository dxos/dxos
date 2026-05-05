//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeHttpClient } from '@dxos/edge-client';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

/**
 * Module-level cache of `EdgeHttpClient` per dxos `Client` so the VP-auth
 * handshake (request → 401 challenge → signed retry) only runs once per
 * session instead of once per consumer container. React strict-mode remounts
 * and multiple profile panels (Account, Invitations) all reuse the same
 * underlying client, which means a single Authorization header is cached and
 * subsequent requests skip the 401 round-trip.
 */
const cache = new WeakMap<Client, EdgeHttpClient>();

/**
 * Returns a shared `EdgeHttpClient` pointing at the configured hub URL, with
 * the current identity set for VP auth. Resolves to `undefined` until both
 * the hub URL and the user's identity are available.
 */
export const useHubHttpClient = (): EdgeHttpClient | undefined => {
  const client = useClient();
  const identity = useIdentity();
  const [httpClient, setHttpClient] = useState<EdgeHttpClient | undefined>(() => cache.get(client));

  useEffect(() => {
    const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
    if (!hubUrl || !identity) {
      setHttpClient(undefined);
      return;
    }
    let instance = cache.get(client);
    if (!instance) {
      instance = new EdgeHttpClient(hubUrl);
      cache.set(client, instance);
    }
    instance.setIdentity(createEdgeIdentity(client));
    setHttpClient(instance);
  }, [client, identity]);

  return httpClient;
};
