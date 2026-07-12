//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Panproto } from './index';

// A permissive scalar lexicon covering the field shapes the transforms exercise. The bridge applies
// value transforms within this schema (same-schema identity): declared fields survive and are rewritten
// in place; undeclared fields are pruned. `required: []` so any subset of fields parses.
const LEXICON = {
  lexicon: 1,
  id: 'echo.sample',
  defs: {
    main: {
      type: 'record',
      key: 'tid',
      record: {
        type: 'object',
        required: [],
        properties: {
          status: { type: 'string' },
          title: { type: 'string' },
          startedAt: { type: 'string' },
          isbn: { type: 'string' },
          authors: { type: 'string' },
          rating: { type: 'integer' },
          stars: { type: 'integer' },
          owned: { type: 'boolean' },
        },
      },
    },
  },
};

const VERTEX = 'echo.sample:body';

const run = (
  fieldTransforms: Panproto.FieldTransform[],
  record: Record<string, unknown>,
): Promise<Record<string, unknown>> =>
  Panproto.transform({ lexicon: LEXICON, spec: { rootVertex: VERTEX, fieldTransforms }, record });

const fieldTransform = (key: string, expr: Panproto.Expr): Panproto.FieldTransform => ({ vertex: VERTEX, key, expr });

// These transforms are the core value rewrites an ECHO type <-> atproto lexicon mapping needs; the
// bridge must execute each generically (via the vendored panproto engine) so the mapping standard is
// reusable across content types, not special-cased to books.
describe('Panproto', () => {
  test('enum knownValue: prefixes a bare literal and strips it back', async ({ expect }) => {
    const prefix = Panproto.prefix('buzz.bookhive.defs#', Panproto.field('status'));
    const encoded = await run([fieldTransform('status', prefix)], { status: 'reading' });
    expect(encoded.status).toBe('buzz.bookhive.defs#reading');

    const strip = Panproto.stripPrefix('buzz.bookhive.defs#', Panproto.field('status'));
    const decoded = await run([fieldTransform('status', strip)], { status: 'buzz.bookhive.defs#reading' });
    expect(decoded.status).toBe('reading');
  });

  test('date <-> datetime: widens a date to midnight UTC and slices it back', async ({ expect }) => {
    const widen = Panproto.suffix('T00:00:00.000Z', Panproto.field('startedAt'));
    const widened = await run([fieldTransform('startedAt', widen)], { startedAt: '2018-11-13' });
    expect(widened.startedAt).toBe('2018-11-13T00:00:00.000Z');

    const narrow = Panproto.slice(Panproto.field('startedAt'), 0, 10);
    const narrowed = await run([fieldTransform('startedAt', narrow)], { startedAt: '2018-11-13T09:41:07.000Z' });
    expect(narrowed.startedAt).toBe('2018-11-13');
  });

  test('numeric rescale: maps a 1–10 integer to a 1–5 scale via float math, rounding to an int', async ({ expect }) => {
    // Round(stars * 0.5): 7 -> round(3.5) -> 4. Exercises IntToFloat, a float literal, Mul, and Round;
    // the result is an int, matching the field's declared type.
    const rescale = Panproto.builtin('Round', [
      Panproto.builtin('Mul', [Panproto.builtin('IntToFloat', [Panproto.field('stars')]), Panproto.float(0.5)]),
    ]);
    const out = await run([fieldTransform('stars', rescale)], { stars: 7 });
    expect(out.stars).toBe(4);
  });

  test('reversible integer offset: round-trips via Add/Sub', async ({ expect }) => {
    const encoded = await run([fieldTransform('rating', Panproto.builtin('Add', [Panproto.field('rating'), Panproto.int(1)]))], {
      rating: 850,
    });
    expect(encoded.rating).toBe(851);

    const decoded = await run([fieldTransform('rating', Panproto.builtin('Sub', [Panproto.field('rating'), Panproto.int(1)]))], {
      rating: 851,
    });
    expect(decoded.rating).toBe(850);
  });

  test('string builtins: normalizes case and extracts a split element', async ({ expect }) => {
    const upper = await run([fieldTransform('isbn', Panproto.builtin('Upper', [Panproto.field('isbn')]))], {
      isbn: '978x0441013593',
    });
    expect(upper.isbn).toBe('978X0441013593');

    // Head(Split(authors, '\t')) — first author from a tab-separated string.
    const firstAuthor = Panproto.builtin('Head', [Panproto.builtin('Split', [Panproto.field('authors'), Panproto.str('\t')])]);
    const out = await run([fieldTransform('authors', firstAuthor)], { authors: 'Frank Herbert\tKevin J. Anderson' });
    expect(out.authors).toBe('Frank Herbert');
  });

  test('applies multiple transforms in one pass, leaving untouched fields (and their types) intact', async ({ expect }) => {
    const out = await run(
      [
        fieldTransform('status', Panproto.prefix('buzz.bookhive.defs#', Panproto.field('status'))),
        fieldTransform('startedAt', Panproto.suffix('T00:00:00.000Z', Panproto.field('startedAt'))),
      ],
      { status: 'finished', startedAt: '2020-05-01', title: 'Dune', rating: 850, owned: true },
    );
    expect(out.status).toBe('buzz.bookhive.defs#finished');
    expect(out.startedAt).toBe('2020-05-01T00:00:00.000Z');
    // Untransformed fields pass through with their types preserved.
    expect(out.title).toBe('Dune');
    expect(out.rating).toBe(850);
    expect(out.owned).toBe(true);
  });

  test('no transforms: returns the record unchanged', async ({ expect }) => {
    const out = await run([], { title: 'Dune', rating: 5, owned: false });
    expect(out).toMatchObject({ title: 'Dune', rating: 5, owned: false });
  });
});
