//
// Copyright 2026 DXOS.org
//

import { type Client } from '@dxos/client';

import { SandboxClient } from './SandboxClient';

/**
 * Edge origin serving sandbox-service (`runtime.services.sandbox.url`); {@link SandboxClient}
 * appends the `/sandbox` prefix.
 */
export const getSandboxServiceUrl = (client: Client): string => {
  const url = client.config.values.runtime?.services?.sandbox?.url;
  if (!url) {
    throw new Error('Sandbox service URL not configured (runtime.services.sandbox.url).');
  }
  return url.replace(/\/$/, '');
};

/** Builds a {@link SandboxClient} from the DXOS client config. */
export const createSandboxClient = (client: Client): SandboxClient => new SandboxClient(getSandboxServiceUrl(client));
