//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EDGE_REQUEST_RESOURCE_TYPES, classify, classifyOrigin } from './network.ts';

describe('classifyOrigin', () => {
  test('a subdomain of an edge host is edge', ({ expect }) => {
    // Suffix-matched so every deployment of the worker counts without being listed: the flow runs
    // against `dx.yml`'s `https://dxos.network/`, while a PR preview serves from
    // `*.dxos.workers.dev`.
    expect(classifyOrigin('https://dxos.network/api/spaces')).toBe('edge');
    expect(classifyOrigin('wss://preview.dxos.network/ws/abc/def')).toBe('edge');
    expect(classifyOrigin('https://pr-1-composer-dev.dxos.workers.dev/db')).toBe('edge');
  });

  test('a host that merely ends in the same letters is not edge', ({ expect }) => {
    // `endsWith` alone would match `notdxos.network`, which is how a deny-list becomes a hole.
    expect(classifyOrigin('https://notdxos.network/api')).toBe('other');
    expect(classifyOrigin('https://dxos.network.example.com/api')).toBe('other');
  });

  test('analytics wins when a host matches both lists', ({ expect }) => {
    // Order is load-bearing, and this is the case that proves it: with `posthog.com` ALSO named as
    // an edge host, the analytics test running first is the only reason telemetry stays out of the
    // backend column.
    expect(classifyOrigin('https://eu.i.posthog.com/e/')).toBe('analytics');
    expect(classifyOrigin('https://eu.i.posthog.com/e/', ['posthog.com'])).toBe('analytics');
  });

  test('a host that only CONTAINS an analytics name is not analytics', ({ expect }) => {
    // `posthog.com.dxos.network` ends in the edge suffix, so it is the backend — the analytics
    // name sits in the prefix and matches nothing. Suffix rules cannot see a proxy that does not
    // announce itself in its host, and pretending otherwise would be the hole.
    expect(classifyOrigin('https://posthog.com.dxos.network/e/', ['dxos.network'])).toBe('edge');
  });

  test('an unparseable url is other, not edge', ({ expect }) => {
    // A malformed url must never widen the edge column; `new URL` throws on these.
    expect(classifyOrigin('not-a-url')).toBe('other');
    expect(classifyOrigin('')).toBe('other');
  });

  test('the edge host list is overridable for a local worker', ({ expect }) => {
    // A run against `wrangler dev` talks to localhost, which is third party under the default.
    expect(classifyOrigin('http://localhost:8787/db')).toBe('other');
    expect(classifyOrigin('http://localhost:8787/db', ['localhost'])).toBe('edge');
  });
});

describe('classify', () => {
  test('a wasm chunk fetched by script is code, not api', ({ expect }) => {
    // Intent over transport: the extension decides, because the app loading itself is code
    // however it was requested.
    expect(classify('https://dxos.network/assets/sqlite-abc.wasm', 'fetch')).toBe('code');
  });

  test('a websocket is api', ({ expect }) => {
    // The handshake response only; the frames are counted by the socket listener, since a socket
    // emits exactly one response and it carries an empty body.
    expect(classify('wss://dxos.network/ws/a/b', 'websocket')).toBe('api');
  });

  test('a websocket is in the api bucket but is not an edge REQUEST', ({ expect }) => {
    // The distinction the request counter turns on: both are `api`, only one is a call. Counting
    // the handshake as a request would report a connection as a call and double-count traffic
    // `edgeSocketFrames` already holds.
    expect(EDGE_REQUEST_RESOURCE_TYPES.has('websocket')).toBe(false);
    expect(EDGE_REQUEST_RESOURCE_TYPES.has('eventsource')).toBe(false);
    expect(EDGE_REQUEST_RESOURCE_TYPES.has('fetch')).toBe(true);
    expect(EDGE_REQUEST_RESOURCE_TYPES.has('xhr')).toBe(true);
  });
});
