//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Config } from './config';
import { EdgeServiceName, getEdgeServiceEndpoint, getRequiredEdgeServiceEndpoint } from './edge-services';

// Unconfigured lookups must never inject an endpoint (configPreset is exempt: calling the factory is the opt-in).
describe('no default endpoints', () => {
  test('getEdgeServiceEndpoint returns undefined when unconfigured', () => {
    expect(getEdgeServiceEndpoint(new Config(), EdgeServiceName.Calls)).toBeUndefined();
  });

  test('getEdgeServiceEndpoint resolves the configured entry (last one wins)', () => {
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

  test('getRequiredEdgeServiceEndpoint names the service and the config path when unconfigured', () => {
    expect(() => getRequiredEdgeServiceEndpoint(new Config(), EdgeServiceName.Calls)).toThrow(
      'The calls service is not configured (runtime.services.edgeServices: calls).',
    );
  });
});
