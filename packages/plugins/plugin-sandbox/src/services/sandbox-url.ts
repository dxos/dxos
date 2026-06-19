//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';

import { SandboxClient } from './SandboxClient';

/**
 * Sandbox-service worker origin (`runtime.services.sandbox.url`).
 * REST API is mounted at `/api/sandbox` on this host.
 */
export const getSandboxServiceUrl = (client: Client): string => {
  const url = client.config.values.runtime?.services?.sandbox?.url;
  if (!url) {
    throw new Error('Sandbox service URL not configured (runtime.services.sandbox.url).');
  }
  return url.replace(/\/$/, '');
};

/** Builds a {@link SandboxClient} from the DXOS client config. */
export const createSandboxClient = (client: Client): SandboxClient =>
  new SandboxClient(getSandboxServiceUrl(client));
