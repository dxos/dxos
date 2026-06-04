//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type HubHttpClient } from '@dxos/edge-client';
import { useClient } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { ClientCapabilities } from '#types';

/**
 * Returns the shared `HubHttpClient` singleton for hub-service API calls.
 * Updates the VP-auth identity whenever the signed-in user changes.
 * Returns `undefined` when the hub URL is unconfigured (no HubHttpClient capability).
 */
export const useHubHttpClient = (): HubHttpClient | undefined => {
  const client = useClient();
  const identity = useIdentity();
  const [hubHttpClient] = useCapabilities(ClientCapabilities.HubHttpClient);

  useEffect(() => {
    if (hubHttpClient && identity) {
      hubHttpClient.setIdentity(createEdgeIdentity(client));
    }
  }, [client, identity, hubHttpClient]);

  return hubHttpClient ?? undefined;
};
