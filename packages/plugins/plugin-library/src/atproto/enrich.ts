//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { lookupHiveBook } from '../operations/bookhive';
import { browserCorsProxy } from '../operations/cors';
import { getHiveId } from './hive';

/** Set a catalog field only when it is currently empty — never overwrite a local edit. */
const setIfEmpty = (book: Obj.Unknown, path: readonly string[], value: unknown): void => {
  if (value == null || (Array.isArray(value) && value.length === 0)) {
    return;
  }
  const current = Obj.getValue(book, path);
  const empty = current == null || current === '' || (Array.isArray(current) && current.length === 0);
  if (empty) {
    Obj.setValue(book, path, value);
  }
};

/**
 * Fill a book's catalog from its linked BookHive record. Imported books carry only the identity fields
 * present on the wire record (title/authors/identifiers); the rich metadata (cover, genres, description,
 * page count, …) lives in BookHive's catalog, so it is fetched by hive id and merged into empty fields
 * only. No-op when the book is unlinked or offline.
 */
export const enrichBook = async (object: unknown): Promise<void> => {
  // The annotation is generically typed (`unknown`); only Books carry this closure.
  const book = object as Obj.Unknown;
  const hiveId = getHiveId(book);
  if (!hiveId || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return;
  }

  const suggestion = await EffectEx.runPromise(lookupHiveBook(hiveId, { corsProxy: browserCorsProxy() }));
  if (!suggestion) {
    return;
  }

  Obj.update(book, () => {
    setIfEmpty(book, ['catalog', 'cover'], suggestion.coverUrl);
    setIfEmpty(book, ['catalog', 'thumbnail'], suggestion.thumbnail);
    setIfEmpty(book, ['catalog', 'description'], suggestion.description);
    setIfEmpty(book, ['catalog', 'genres'], suggestion.genres);
    setIfEmpty(book, ['catalog', 'language'], suggestion.language);
    setIfEmpty(book, ['catalog', 'numPages'], suggestion.numPages);
    setIfEmpty(book, ['catalog', 'publicationYear'], suggestion.publicationYear);
    setIfEmpty(book, ['catalog', 'publisher'], suggestion.publisher);
    // Per-key: `identifiers` already carries `hiveId` (from decode), so a whole-struct set would never
    // fire; fill the individual external ids when missing.
    setIfEmpty(book, ['catalog', 'identifiers', 'isbn10'], suggestion.identifiers?.isbn10);
    setIfEmpty(book, ['catalog', 'identifiers', 'isbn13'], suggestion.identifiers?.isbn13);
    setIfEmpty(book, ['catalog', 'identifiers', 'goodreadsId'], suggestion.identifiers?.goodreadsId);
  });
};
