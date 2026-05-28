//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

/**
 * atproto OAuth scopes for recovery registration and recovery flows.
 * `transition:generic` grants full offline-access so the stored token is usable
 * for space operations after registration.
 */
export const ATPROTO_OAUTH_SCOPES = ['atproto', 'transition:generic', 'transition:email'] as const;

/**
 * Create an `EdgeHttpClient` pointed at the configured edge URL. Extracted here
 * so all OAuth recovery operations share the same construction pattern.
 */
export const createEdgeHttpClient = (client: Client): EdgeHttpClient => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'Edge URL not configured.');
  return new EdgeHttpClient(edgeUrl);
};
