//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';

import * as Panproto from './Panproto';
import { migrate } from './wasm';

// A minimal ECHO type exercising every adapter kind (nested catalog, array, ref, scalar, date).
class Thing extends Type.makeObject<Thing>(DXN.make('org.dxos.test.LensThing', '0.1.0'))(
  Schema.Struct({
    catalog: Schema.Struct({
      title: Schema.String,
      authors: Schema.Array(Schema.String),
      identifiers: Schema.optional(Schema.Struct({ hiveId: Schema.optional(Schema.String), isbn13: Schema.optional(Schema.String) })),
    }),
    status: Schema.optional(Schema.String),
    startedAt: Schema.optional(Schema.String),
    // Modeled as a plain string here (a real Ref<Text> is exercised by the book lens); the `stub` ref
    // codec below reads/writes strings so the adapter plumbing is tested without a database.
    review: Schema.optional(Schema.String),
  }),
) {}

const lens: Panproto.Lens = {
  adapters: [
    { kind: 'scalar', wire: 'title', echo: ['catalog', 'title'] },
    { kind: 'array', wire: 'authors', echo: ['catalog', 'authors'], separator: '\t' },
    { kind: 'prefix', wire: 'status', echo: ['status'], prefix: 'buzz.bookhive.defs#' },
    { kind: 'dateOnly', wire: 'startedAt', echo: ['startedAt'] },
    { kind: 'ref', wire: 'review', echo: ['review'], ref: { refType: 'stub', format: 'upper' } },
    { kind: 'meta', wire: 'createdAt', metaField: 'createdAt' },
    { kind: 'derive', wire: 'hiveBookUri', from: ['catalog', 'identifiers', 'hiveId'], template: 'at://svc/catalogBook/{0}' },
    {
      kind: 'struct',
      wire: 'identifiers',
      fields: [
        { kind: 'scalar', wire: 'hiveId', echo: ['catalog', 'identifiers', 'hiveId'] },
        { kind: 'scalar', wire: 'isbn13', echo: ['catalog', 'identifiers', 'isbn13'] },
      ],
    },
  ],
};

const makeThing = () =>
  Obj.make(Thing, {
    catalog: {
      title: 'Dune',
      authors: ['Frank Herbert', 'Kevin J. Anderson'],
      identifiers: { hiveId: 'bk_dune', isbn13: '9780441013593' },
    },
    status: 'reading',
    startedAt: '2020-01-01',
    review: 'a classic.',
  });

describe('Panproto runner', () => {
  // The `upper`/`stub` codecs stand in for the real `markdown-html` text format and `text` ref factory
  // that plugin-library registers; here they make the round-trip observable without `@dxos/schema`.
  Panproto.registerTextFormat('upper', { encode: (value) => value.toUpperCase(), decode: (value) => value.toLowerCase() });
  Panproto.registerRefType('stub', {
    read: async (ref) => (typeof ref === 'string' ? ref : undefined),
    make: (content) => ({ stub: content }),
  });

  test('encodes an ECHO object to a wire record via the adapters', async ({ expect }) => {
    const record = await Panproto.encode(makeThing(), lens);
    expect(record.title).toBe('Dune');
    expect(record.authors).toBe('Frank Herbert\tKevin J. Anderson');
    expect(record.status).toBe('buzz.bookhive.defs#reading');
    expect(record.startedAt).toBe('2020-01-01T00:00:00.000Z');
    expect(record.review).toBe('A CLASSIC.');
    expect(typeof record.createdAt).toBe('string');
    expect(record.hiveBookUri).toBe('at://svc/catalogBook/bk_dune');
    expect(record.identifiers).toMatchObject({ hiveId: 'bk_dune', isbn13: '9780441013593' });
  });

  test('decodes a wire record back to ECHO-shaped values', async ({ expect }) => {
    const record = {
      title: 'Dune',
      authors: 'Frank Herbert\tKevin J. Anderson',
      status: 'buzz.bookhive.defs#reading',
      startedAt: '2020-01-01T00:00:00.000Z',
      review: 'A CLASSIC.',
      createdAt: '2020-01-01T00:00:00.000Z',
      hiveBookUri: 'at://svc/catalogBook/bk_dune',
      identifiers: { hiveId: 'bk_dune', isbn13: '9780441013593' },
    };
    const out = await Panproto.decode(record, lens);
    expect(out.catalog).toMatchObject({
      title: 'Dune',
      authors: ['Frank Herbert', 'Kevin J. Anderson'],
      identifiers: { hiveId: 'bk_dune', isbn13: '9780441013593' },
    });
    expect(out.status).toBe('reading');
    expect(out.startedAt).toBe('2020-01-01');
    // The `stub` factory wraps the format-decoded (lowercased) content.
    expect(out.review).toEqual({ stub: 'a classic.' });
  });
});

describe('Panproto engine (@panproto/core)', () => {
  const lexicon = (id: string, progressKey: string) => ({
    lexicon: 1,
    id,
    defs: {
      main: {
        type: 'record',
        key: 'tid',
        record: {
          type: 'object',
          required: ['title'],
          properties: { title: { type: 'string' }, [progressKey]: { type: 'integer' } },
        },
      },
    },
  });

  test('executes a cross-lexicon structural rename via liftJson', async ({ expect }) => {
    const out = await migrate({
      sourceLexicon: lexicon('org.dxos.test.book', 'progress'),
      targetLexicon: lexicon('buzz.bookhive.book', 'bookProgress'),
      sourceVertex: 'org.dxos.test.book:body',
      renames: [{ from: 'progress', to: 'bookProgress' }],
      record: { title: 'Dune', progress: 42 },
    });
    expect(out.title).toBe('Dune');
    expect(out.bookProgress).toBe(42);
    expect(out.progress).toBeUndefined();
  });
});
