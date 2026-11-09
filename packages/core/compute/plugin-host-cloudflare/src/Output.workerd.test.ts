//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import * as Output from './Output.ts';

describe('Output', () => {
  test('a ref encodes to its uri envelope and survives structured clone', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Ada' });
    const encoded = Output.encode({ person: Ref.make(person), imported: false });

    // The shape `importPullRequest` returns, and the one a caller decodes with `decodeEntities`.
    expect(encoded).toEqual({ person: { '/': expect.any(String) }, imported: false });
    // `noInline` drops the target: an inlined one would carry the whole entity across the boundary.
    // `Object()` rather than a cast: `encode` returns `unknown`, and it throws here if the field is absent.
    expect(Reflect.get(Object(Reflect.get(Object(encoded), 'person')), 'target')).toBeUndefined();
    // The assertion that matters — workerd refuses a `Ref` here, which is the failure this reproduces.
    expect(() => structuredClone(encoded)).not.toThrow();
  });

  test('a ref nested in an array encodes too', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Ada' });
    const encoded = Output.encode({ people: [Ref.make(person)] });

    expect(encoded).toEqual({ people: [{ '/': expect.any(String) }] });
    expect(() => structuredClone(encoded)).not.toThrow();
  });

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
