//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type HubHttpClient } from '@dxos/edge-client';
import { useIdentity } from '@dxos/halo-react';

import { ClientCapabilities } from '#types';

/**
 * Returns the shared `HubHttpClient` singleton for hub-service API calls.
 * Updates the VP-auth identity whenever the signed-in user changes.
 * Returns `undefined` when the hub URL is unconfigured (no HubHttpClient capability).
 */
export const useHubHttpClient = (): HubHttpClient | undefined => {
  const identity = useIdentity();
  const [identityService] = useCapabilities(ClientCapabilities.IdentityService);
  const [hubHttpClient] = useCapabilities(ClientCapabilities.HubHttpClient);

  useEffect(() => {
    if (!hubHttpClient || !identity || !identityService) {
      return;
    }
    const edgeIdentity = identityService.getEdgeIdentity();
    if (Option.isSome(edgeIdentity)) {
      hubHttpClient.setIdentity(edgeIdentity.value);
    }
  }, [identity, identityService, hubHttpClient]);

  return hubHttpClient ?? undefined;
};
