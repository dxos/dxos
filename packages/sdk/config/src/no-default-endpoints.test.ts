//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Config } from './config.ts';
import { EdgeServiceName, getEdgeServiceEndpoint } from './edge-services.ts';

// Unconfigured lookups must never inject an endpoint (configPreset is exempt: calling the factory is the opt-in).
describe('no default endpoints', () => {
  test('getEdgeServiceEndpoint returns undefined when unconfigured', ({ expect }) => {
    expect(getEdgeServiceEndpoint(new Config(), EdgeServiceName.Calls)).toBeUndefined();
  });

  test('getEdgeServiceEndpoint resolves the configured entry (last one wins)', ({ expect }) => {
    const config = new Config({
      runtime: {
        services: {
          edgeServices: [
            { name: 'calls', endpoint: 'https://calls.example.com' },
            { name: 'calls', endpoint: 'https://calls-override.example.com' },
          ],
        },
      },
    });
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Calls)).toEqual('https://calls-override.example.com');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Image)).toBeUndefined();
  });
});
