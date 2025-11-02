//
// Copyright 2025 DXOS.org
//

import { describe, it } from 'vitest';

import { createEphemeralEdgeIdentity } from './auth';
import { EdgeHttpClient } from './edge-http-client';

// TODO(burdon): Factor out config.
const DEV_SERVER = 'https://edge.dxos.workers.dev';

describe.skipIf(process.env.CI)('EdgeHttpClient', () => {
  it.skip('should get status', async ({ expect }) => {
    const client = new EdgeHttpClient(DEV_SERVER);
    const identity = await createEphemeralEdgeIdentity();
    client.setIdentity(identity);

    const result = await client.getStatus();
    expect(result).toBeDefined();
  });
});
