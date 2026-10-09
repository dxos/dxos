//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Config } from './config.ts';
import { EdgeServiceName, getEdgeServiceEndpoint } from './edge-services.ts';

const configWithEdge = (url: string) => new Config({ runtime: { services: { edge: { url } } } });

describe('edge services', () => {
  test('every service resolves under the configured EDGE entrypoint', ({ expect }) => {
    const config = configWithEdge('https://dxos.network');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Calls)).toBe('https://dxos.network/calls');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Image)).toBe('https://dxos.network/image');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Discord)).toBe('https://dxos.network/discord');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.CorsProxy)).toBe('https://dxos.network/cors-proxy');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Sandbox)).toBe('https://dxos.network/sandbox');
    // The ASR endpoint is calls-service's `/transcribe`; transcription-service is the `/video` one.
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Transcription)).toBe('https://dxos.network/calls');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.VideoTranscription)).toBe(
      'https://dxos.network/transcription',
    );
    // The configured value IS the MCP server URL, so it carries the path a client connects to.
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Introspect)).toBe('https://dxos.network/introspect/mcp');
  });

  test('the environment follows the EDGE entrypoint, so no service can point at another tier', ({ expect }) => {
    expect(getEdgeServiceEndpoint(configWithEdge('https://preview.dxos.network'), EdgeServiceName.Image)).toBe(
      'https://preview.dxos.network/image',
    );
    expect(getEdgeServiceEndpoint(configWithEdge('http://localhost:8787'), EdgeServiceName.Image)).toBe(
      'http://localhost:8787/image',
    );
  });

  test('a trailing slash on the entrypoint does not double up', ({ expect }) => {
    // `composer-app/dx.yml` writes the URL with one.
    expect(getEdgeServiceEndpoint(configWithEdge('https://dxos.network/'), EdgeServiceName.Calls)).toBe(
      'https://dxos.network/calls',
    );
  });

  test('an explicit entry overrides the derived endpoint', ({ expect }) => {
    const config = new Config({
      runtime: {
        services: {
          edge: { url: 'https://dxos.network' },
          edgeServices: [{ name: 'image', endpoint: 'http://localhost:8790' }],
        },
      },
    });
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Image)).toBe('http://localhost:8790');
    expect(getEdgeServiceEndpoint(config, EdgeServiceName.Calls)).toBe('https://dxos.network/calls');
  });
});
