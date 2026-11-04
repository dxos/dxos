//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as Output from './Output.ts';

describe('Output', () => {
  test('an object shared by two fields is encoded in both', ({ expect }) => {
    const shared = { person: Obj.make(TestSchema.Person, { name: 'Ada' }) };
    const encoded = Output.encode({ first: shared, second: shared });
    expect(encoded).toMatchObject({
      first: { person: { '@type': expect.any(String), 'name': 'Ada' } },
      second: { person: { '@type': expect.any(String), 'name': 'Ada' } },
    });
  });

  test('a cycle ends the walk', ({ expect }) => {
    const loop: Record<string, unknown> = { name: 'loop' };
    loop.self = loop;
    expect(() => Output.encode(loop)).not.toThrow();
  });

  test('decoding keeps a value that is not a plain object', async ({ expect }) => {
    const at = new Date(0);
    const bytes = new Uint8Array([1, 2]);
    const decoded = await Output.decodeEntities(
      { at, bytes },
      async () => undefined,
      () => undefined,
    );
    expect(decoded).toEqual({ at, bytes });
  });
});
