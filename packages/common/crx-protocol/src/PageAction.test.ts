//
// Copyright 2026 DXOS.org
//

import * as Either from 'effect/Either';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { PageAction } from './index';

describe('PageAction schema', () => {
  test('decodes a valid list request', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(PageAction.ListRequest)({ version: 1, id: 'req-1' });
    expect(Either.isRight(decoded)).toBe(true);
  });

  test('rejects a list request with a wrong version', ({ expect }) => {
    const decoded = Schema.decodeUnknownEither(PageAction.ListRequest)({ version: 2, id: 'req-1' });
    expect(Either.isLeft(decoded)).toBe(true);
  });

  test('round-trips an invoke ack', ({ expect }) => {
    const ack: PageAction.InvokeAck = { version: 1, id: 'req-1', ok: true, objectId: 'obj-1' };
    const encoded = Schema.encodeSync(PageAction.InvokeAck)(ack);
    const decoded = Schema.decodeUnknownSync(PageAction.InvokeAck)(encoded);
    expect(decoded).toEqual(ack);
  });

  test('round-trips a descriptor', ({ expect }) => {
    const descriptor: PageAction.Descriptor = {
      id: 'a1',
      label: 'Add note',
      icon: 'ph--note--regular',
      urlPatterns: ['https://*/*'],
      extractor: { name: 'snapshot' },
      contexts: ['popup'],
      operation: 'demo/add-note',
    };
    const decoded = Schema.decodeUnknownSync(PageAction.Descriptor)(descriptor);
    expect(decoded).toEqual(descriptor);
  });
});
