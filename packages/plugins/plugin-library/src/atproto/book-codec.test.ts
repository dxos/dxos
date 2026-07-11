//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Book } from '#types';

import { bookCodec } from './book-codec';

const PRIVATE_FIELDS = ['notes', 'owned', 'format', 'purchasePrice', 'purchaseDate', 'shelfLocation', 'personalTags'];
// Public info that is nonetheless NOT part of buzz.bookhive.book (sourced from the hive book).
const UNMAPPED_FIELDS = ['genres', 'coverUrl'];

const makeSampleBook = () =>
  Book.makeBook({
    title: 'Dune',
    authors: ['Frank Herbert', 'Kevin J. Anderson'],
    hiveId: 'bk_dune',
    status: 'finished',
    stars: 9,
    review: 'A classic.',
    genres: ['Science Fiction'],
    coverUrl: 'https://example.com/dune.jpg',
    notes: 'private notes — do not publish',
    owned: true,
    format: 'hardcover',
    purchasePrice: 24.99,
    shelfLocation: 'A3',
    personalTags: ['gift', 'reread'],
  });

describe('bookCodec', () => {
  test('encodes public fields into a buzz.bookhive.book record', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());

    expect(record.title).toBe('Dune');
    // Authors are joined to a tab-separated string at the lexicon boundary.
    expect(record.authors).toBe('Frank Herbert\tKevin J. Anderson');
    expect(record.hiveId).toBe('bk_dune');
    // status maps to the buzz.bookhive.defs knownValue reference on the wire.
    expect(record.status).toBe('buzz.bookhive.defs#finished');
    expect(record.stars).toBe(9);
    expect(record.review).toBe('A classic.');
    // createdAt is required by the lexicon and injected from the object's creation timestamp.
    expect(typeof record.createdAt).toBe('string');
  });

  test('egress gate: private and unmapped fields NEVER appear in the encoded record', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());
    for (const field of [...PRIVATE_FIELDS, ...UNMAPPED_FIELDS]) {
      expect(record[field], `field "${field}" must not be published`).toBeUndefined();
    }
  });

  test('round-trips authors array through the tab-separated boundary', async ({ expect }) => {
    const record = await bookCodec.encode(makeSampleBook());
    const decoded = await bookCodec.decode(record);

    expect(decoded.title).toBe('Dune');
    expect(decoded.authors).toEqual(['Frank Herbert', 'Kevin J. Anderson']);
    expect(decoded.hiveId).toBe('bk_dune');
    expect(decoded.status).toBe('finished');
    expect(decoded.stars).toBe(9);
  });
});
