//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Proxy } from './index';

describe('Proxy schema', () => {
  test('decodes a render request with optional fields', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(Proxy.RenderRequest)({
      version: 1,
      id: 'r1',
      url: 'https://example.com',
      waitForSelector: '#root',
      active: true,
    });
    expect(Either.isRight(decoded)).toBe(true);
  });

  test('rejects a render request with a wrong version', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(Proxy.RenderRequest)({ version: 2, id: 'r1', url: 'https://x' });
    expect(Either.isLeft(decoded)).toBe(true);
  });

  test('round-trips a render ack (ok)', ({ expect }) => {
    const ack: Proxy.RenderAck = { version: 1, id: 'r1', ok: true, html: '<html/>', finalUrl: 'https://x' };
    expect(Schema.decodeUnknownSync(Proxy.RenderAck)(Schema.encodeSync(Proxy.RenderAck)(ack))).toEqual(ack);
  });

  test('rejects a render ack with an unknown error code', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(Proxy.RenderAck)({ version: 1, id: 'r1', ok: false, error: 'nope' });
    expect(Either.isLeft(decoded)).toBe(true);
  });

  test('round-trips a ping ack (ok)', ({ expect }) => {
    const ack: Proxy.PingAck = { version: 1, id: 'p1', ok: true, extensionVersion: '0.1.0', extensionName: 'Composer' };
    expect(Schema.decodeUnknownSync(Proxy.PingAck)(Schema.encodeSync(Proxy.PingAck)(ack))).toEqual(ack);
  });
});
