//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';

import { SandboxClient } from './SandboxClient.ts';

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
 * Whether a credential may be put on the wire to `url`.
 *
 * HTTPS, or a loopback host — `runtime.services.sandbox.url` exists to point at a local
 * `wrangler dev`, which is plain HTTP but never leaves the machine. Any other `http://` target is a
 * credential in cleartext across a network, so the presentation is withheld rather than sent.
 */
export const acceptsCredentials = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
};

/**
 * Mints the verifiable presentation sandbox-service authenticates every route with.
 *
 * The edge client is created lazily and the identity re-applied on every call: identity becomes
 * available after boot and can be swapped, and a client bound once would go on presenting the
 * identity it was built with.
 */
const createAuthHeaderProvider = (client: Client, sandboxUrl: string): (() => Promise<string | undefined>) => {
  const edgeUrl = client.config.values.runtime?.services?.edge?.url;
  const maySendCredentials = acceptsCredentials(sandboxUrl);
  if (!maySendCredentials) {
    log.warn('sandbox: endpoint is not https, requests will be unauthenticated', { sandboxUrl });
  }

  let edgeClient: EdgeHttpClient | undefined;
  return async () => {
    if (!edgeUrl || !maySendCredentials) {
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

/**
 * Builds a {@link SandboxClient} from the DXOS client config.
 *
 * The returned client resolves the edge credential per request, and sends the request
 * unauthenticated when no identity is available yet or the endpoint would carry it in cleartext
 * (see {@link acceptsCredentials}).
 */
export const createSandboxClient = (client: Client): SandboxClient => {
  const url = getSandboxServiceUrl(client);
  return new SandboxClient(url, createAuthHeaderProvider(client, url));
};
