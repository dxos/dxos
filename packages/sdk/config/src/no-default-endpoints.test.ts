//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Config } from './config';
import { defaultConfig } from './config-service';
import { EdgeServiceName, getEdgeServiceEndpoint } from './edge-services';
import { configPreset } from './preset';

// Absent config must mean "no edge" — nothing in @dxos/config may inject an endpoint.
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

  test('configPreset omits the edge service when no environment is given', () => {
    expect(configPreset().get('runtime.services.edge.url')).toBeUndefined();
    expect(configPreset({ sandbox: 'local' }).get('runtime.services.edge.url')).toBeUndefined();
    expect(configPreset({ edge: 'local' }).get('runtime.services.edge.url')).toEqual('http://localhost:8787');
  });

  test('defaultConfig carries no service endpoints', () => {
    expect(defaultConfig.get('runtime.services')).toBeUndefined();
  });
});
