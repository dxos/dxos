//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';

import { SandboxClient } from './SandboxClient';

/**
 * Base URL of the sandbox-service REST API.
 *
 * Normally `<edge>/sandbox`, derived from `runtime.services.edge.url` — sandbox-service is reached
 * through the EDGE entrypoint like every other service. `runtime.services.sandbox.url` stays as the
 * override for a worker that is not behind EDGE (a local `wrangler dev` on port 8792).
 */
export const getSandboxServiceUrl = (client: Client): string => {
  const url =
    client.config.values.runtime?.services?.sandbox?.url ??
    getEdgeServiceEndpoint(client.config, EdgeServiceName.Sandbox);
  if (!url) {
    throw new Error('Sandbox service URL not configured (runtime.services.edge.url or .sandbox.url).');
  }
  return url.replace(/\/$/, '');
};

/**
 * Mints the verifiable presentation sandbox-service authenticates every route with.
 *
 * The edge client is created lazily and the identity re-applied on every call: identity becomes
 * available after boot and can be swapped, and a client bound once would go on presenting the
 * identity it was built with.
 */
const createAuthHeaderProvider = (client: Client): (() => Promise<string | undefined>) => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  let edgeClient: EdgeHttpClient | undefined;
  return async () => {
    if (!edgeUrl) {
      return undefined;
    }
    try {
      edgeClient ??= new EdgeHttpClient(edgeUrl);
      edgeClient.setIdentity(createEdgeIdentity(client));
      return await edgeClient.getAuthHeader();
    } catch (error) {
      // Identity and device become ready independently; an unauthenticated request gets a 401 the
      // caller can report, which is more useful than failing here with a different error.
      log.warn('sandbox: no edge credential available', { error });
      return undefined;
    }
  };
};

/** Builds a {@link SandboxClient} from the DXOS client config. */
export const createSandboxClient = (client: Client): SandboxClient =>
  new SandboxClient(getSandboxServiceUrl(client), createAuthHeaderProvider(client));
