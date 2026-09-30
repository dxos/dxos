//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { type Config, EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { EdgeHttpClient } from '@dxos/edge-client';
import { type Identity } from '@dxos/halo';
import { log } from '@dxos/log';

import { SandboxClient } from './SandboxClient.ts';

/** What reaching sandbox-service takes: the endpoint config and the identity to authenticate as. */
export type EdgeContext = {
  readonly config: Config;
  readonly identity: Identity.ServiceApi;
};

/**
 * Base URL of the sandbox-service REST API.
 *
 * Normally `<edge>/sandbox`, derived from `runtime.services.edge.url` — sandbox-service is reached
 * through the EDGE entrypoint like every other service. `runtime.services.sandbox.url` stays as the
 * override for a worker that is not behind EDGE (a local `wrangler dev` on port 8792).
 */
export const getSandboxServiceUrl = (config: Config): string => {
  const url = config.values.runtime?.services?.sandbox?.url ?? getEdgeServiceEndpoint(config, EdgeServiceName.Sandbox);
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
const createAuthHeaderProvider = (
  { config, identity }: EdgeContext,
  sandboxUrl: string,
): (() => Promise<string | undefined>) => {
  const edgeUrl = config.values.runtime?.services?.edge?.url;
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
      const edgeIdentity = identity.getEdgeIdentity();
      if (Option.isNone(edgeIdentity)) {
        throw new Error('Identity not available');
      }
      edgeClient.setIdentity(edgeIdentity.value);
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
 * Builds a {@link SandboxClient} from the DXOS config and identity.
 *
 * The returned client resolves the edge credential per request, and sends the request
 * unauthenticated when no identity is available yet or the endpoint would carry it in cleartext
 * (see {@link acceptsCredentials}).
 */
export const createSandboxClient = (context: EdgeContext): SandboxClient => {
  const url = getSandboxServiceUrl(context.config);
  return new SandboxClient(url, createAuthHeaderProvider(context, url));
};
