//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { Book } from '#types';

import { bookCodec, canPublishBook } from './book-codec';
import bookLexicon from './lexicons/buzz.bookhive.book.json';

// ECHO-only fields (private) and catalog metadata not carried by buzz.bookhive.book — none may appear
// in the encoded record.
const FORBIDDEN_FIELDS = [
  'catalog',
  'notes',
  'purchasePrice',
  'purchaseDate',
  'shelfLocation',
  'content',
  'cover',
  'thumbnail',
  'genres',
  'description',
  'language',
  'numPages',
  'publisher',
  'publicationYear',
  'rating',
];

const makeSampleBook = () =>
  Book.make({
    catalog: {
      title: 'Dune',
      authors: ['Frank Herbert', 'Kevin J. Anderson'],
      cover: 'https://example.com/dune.jpg',
      genres: ['Science Fiction'],
      // The hive id is a catalog identifier (what gates publishing), alongside ISBN/Goodreads.
      identifiers: { hiveId: 'bk_dune', isbn13: '9780441013593' },
    },
    status: 'finished',
    stars: 8,
    review: Ref.make(Text.make({ content: 'A **classic**.' })),
    // Reading dates are date-only in ECHO (Format.Date); the codec widens them to the wire datetime.
    startedAt: '2020-01-01',
    finishedAt: '2020-02-01',
    owned: true,
    // `cfi` is a private location anchor (never published); percent/currentPage are published progress.
    progress: { percent: 34, currentPage: 412, cfi: 'epubcfi(/6/4!/4/2/1:0)' },
    purchasePrice: 24.99,
    shelfLocation: 'A3',
  });

const reviewContent = async (value: unknown): Promise<string | undefined> => {
  if (!Ref.isRef(value)) {
    return undefined;
  }
  // `.target` is only populated once loaded; `load()` resolves it (immediately here, no database).
  const target = await value.load();
  return Obj.instanceOf(Text.Text, target) ? target.content : undefined;
};

describe('bookCodec', () => {
  test('encodes the public face into a buzz.bookhive.book record', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());

    // Catalog identity is denormalized onto the record; authors joined to a tab string.
    expect(record.title).toBe('Dune');
    expect(record.authors).toBe('Frank Herbert\tKevin J. Anderson');
    expect(record.hiveId).toBe('bk_dune');
    // The catalog link BookHive ingests: at://<catalog-service>/buzz.bookhive.catalogBook/<hiveId>.
    expect(record.hiveBookUri).toBe('at://did:plc:enu2j5xjlqsjaylv3du4myh4/buzz.bookhive.catalogBook/bk_dune');
    // status maps to the buzz.bookhive.defs knownValue reference via the Panproto bridge.
    expect(record.status).toBe('buzz.bookhive.defs#finished');
    expect(record.stars).toBe(8);
    // review resolves from its Text ref and maps ECHO markdown to the wire's HTML.
    expect(record.review).toBe('A <b>classic</b>.');
    expect(record.owned).toBe(true);
    // date-only ECHO values widen to the wire's ISO datetime (midnight UTC).
    expect(record.startedAt).toBe('2020-01-01T00:00:00.000Z');
    expect(record.finishedAt).toBe('2020-02-01T00:00:00.000Z');
    // createdAt is required by the lexicon and injected from the object's creation timestamp.
    expect(typeof record.createdAt).toBe('string');
    // Ref-typed lexicon fields are adapted structurally; identifiers carries the hive id per the def.
    expect(record.identifiers).toMatchObject({ hiveId: 'bk_dune', isbn13: '9780441013593' });
    // progress -> bookProgress; the private `cfi` location anchor is never published.
    expect(record.bookProgress).toMatchObject({ percent: 34, currentPage: 412, updatedAt: expect.any(String) });
    expect(record.bookProgress).not.toHaveProperty('cfi');
  });

  test('encoded record satisfies the lexicon required set', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());
    for (const field of bookLexicon.defs.main.record.required) {
      expect(record[field], `required field "${field}"`).toBeDefined();
    }
  });

  test('egress gate: private and unmapped fields NEVER appear in the encoded record', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());
    for (const field of FORBIDDEN_FIELDS) {
      expect(record[field], `field "${field}" must not be published`).toBeUndefined();
    }
  });

  test('round-trips a book through the wire record', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());
    const decoded = await bookCodec.decode(record);

    // Identity nests back under catalog including the hiveId (a catalog identifier); authors decode to
    // an array (not the raw tab string), or `Form.ArrayField` throws `values?.map is not a function`
    // when the imported Book renders.
    expect(decoded.catalog).toMatchObject({
      title: 'Dune',
      authors: ['Frank Herbert', 'Kevin J. Anderson'],
      identifiers: { hiveId: 'bk_dune', isbn13: '9780441013593' },
    });
    expect(decoded.status).toBe('finished');
    expect(decoded.stars).toBe(8);
    expect(decoded.owned).toBe(true);
    // wire datetime narrows back to a date-only ECHO value.
    expect(decoded.startedAt).toBe('2020-01-01');
    expect(decoded.finishedAt).toBe('2020-02-01');
    // review decodes from the wire's HTML back to markdown in a Text ref.
    expect(await reviewContent(decoded.review)).toBe('A **classic**.');
    // bookProgress -> progress (the private cfi is not on the wire, so it does not round-trip).
    expect(decoded.progress).toMatchObject({ percent: 34, currentPage: 412 });
  });

  test('canPublishBook gates on the BookHive hive id', ({ expect }) => {
    // A catalog-linked book (has identifiers.hiveId) is eligible.
    expect(canPublishBook(makeSampleBook())).toEqual({ ok: true });

    // A custom book (no hive id) is held back with a reason.
    const custom = Book.make({ catalog: { title: 'My Zine', authors: ['Me'] } });
    const eligibility = canPublishBook(custom);
    expect(eligibility.ok).toBe(false);
  });
});
