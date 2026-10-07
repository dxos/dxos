//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Proxy } from './index.ts';

describe('Proxy schema', () => {
  test('decodes a render request with optional fields', ({ expect }) => {
    const decoded = Schema.decodeUnknownResult(Proxy.RenderRequest)({
      version: 1,
      id: 'r1',
      url: 'https://example.com',
      waitForSelector: '#root',
      active: true,
    });
    expect(Result.isSuccess(decoded)).toBe(true);
  });

  test('rejects a render request with a wrong version', ({ expect }) => {
    const decoded = Schema.decodeUnknownResult(Proxy.RenderRequest)({ version: 2, id: 'r1', url: 'https://x' });
    expect(Result.isFailure(decoded)).toBe(true);
  });

  test('round-trips a render ack (ok)', ({ expect }) => {
    const ack: Proxy.RenderAck = { version: 1, id: 'r1', ok: true, html: '<html/>', finalUrl: 'https://x' };
    expect(Schema.decodeUnknownSync(Proxy.RenderAck)(Schema.encodeSync(Proxy.RenderAck)(ack))).toEqual(ack);
  });

  test('rejects a render ack with an unknown error code', ({ expect }) => {
    const decoded = Schema.decodeUnknownResult(Proxy.RenderAck)({ version: 1, id: 'r1', ok: false, error: 'nope' });
    expect(Result.isFailure(decoded)).toBe(true);
  });

  test('round-trips a ping ack (ok)', ({ expect }) => {
    const ack: Proxy.PingAck = { version: 1, id: 'p1', ok: true, extensionVersion: '0.1.0', extensionName: 'Composer' };
    expect(Schema.decodeUnknownSync(Proxy.PingAck)(Schema.encodeSync(Proxy.PingAck)(ack))).toEqual(ack);
  });
});
