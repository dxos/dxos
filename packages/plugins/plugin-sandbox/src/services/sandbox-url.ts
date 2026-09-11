//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';
import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';

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

/** Builds a {@link SandboxClient} from the DXOS client config. */
export const createSandboxClient = (client: Client): SandboxClient => new SandboxClient(getSandboxServiceUrl(client));
