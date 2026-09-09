//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useEffect } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { useIdentity } from '@dxos/halo-react';

import { ClientCapabilities } from '#types';

/**
 * Returns the shared `EdgeHttpClient` singleton — EDGE's own routes plus the account API it
 * proxies under `/hub`. Updates the VP-auth identity whenever the signed-in user changes.
 * Returns `undefined` until the capability activates (the client initializes).
 */
export const useEdgeHttpClient = (): EdgeHttpClient | undefined => {
  const identity = useIdentity();
  const [identityService] = useCapabilities(ClientCapabilities.IdentityService);
  const [edgeHttpClient] = useCapabilities(ClientCapabilities.EdgeHttpClient);

  useEffect(() => {
    if (!edgeHttpClient || !identity || !identityService) {
      return;
    }
    const edgeIdentity = identityService.getEdgeIdentity();
    if (Option.isSome(edgeIdentity)) {
      edgeHttpClient.setIdentity(edgeIdentity.value);
    }
  }, [identity, identityService, edgeHttpClient]);

  return edgeHttpClient ?? undefined;
};
