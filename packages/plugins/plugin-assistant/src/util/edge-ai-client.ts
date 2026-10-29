//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

export type EdgeAiClient = {
  /** The authenticated EDGE client, created on the first AI request. */
  readonly get: () => EdgeHttpClient;
  /** Stops following identity changes. */
  readonly dispose: () => void;
};

/**
 * The EDGE client AI requests go through. Resolved lazily, on the first request: AI providers are set up
 * before the Client capability and the user's identity exist, so requiring them up front would throw.
 */
export const makeEdgeAiClient = (manager: CapabilityManager.CapabilityManager): EdgeAiClient => {
  let edgeClient: EdgeHttpClient | undefined;
  let unsubscribe: (() => void) | undefined;
  const get = (): EdgeHttpClient => {
    if (!edgeClient) {
      const [client] = manager.getAll(ClientCapabilities.Client);
      invariant(client, 'Client capability is required for edge AI requests.');
      const [haloIdentity] = manager.getAll(ClientCapabilities.IdentityService);
      invariant(haloIdentity, 'HALO identity capability is required for edge AI requests.');
      const edgeUrl = client.config.values.runtime?.services?.edge?.url;
      invariant(edgeUrl, 'EDGE services are not configured.');
      const created = new EdgeHttpClient(edgeUrl);
      const updateIdentity = () => {
        const edgeIdentity = haloIdentity.getEdgeIdentity();
        if (Option.isSome(edgeIdentity)) {
          created.setIdentity(edgeIdentity.value);
        }
      };
      updateIdentity();
      unsubscribe = haloIdentity.subscribe(updateIdentity);
      edgeClient = created;
    }
    return edgeClient;
  };
  return { get, dispose: () => unsubscribe?.() };
};
