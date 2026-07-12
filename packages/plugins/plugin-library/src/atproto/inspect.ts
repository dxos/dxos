//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type PublishFieldNote, type PublishInspection } from '@dxos/schema';

import { type BookSuggestion, lookupHiveBook } from '../operations/bookhive';
import { browserCorsProxy } from '../operations/cors';
import { getHiveId } from './hive';

const isEmpty = (value: unknown): boolean =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

const equal = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) || Array.isArray(b)) {
    const aa = Array.isArray(a) ? a : [];
    const bb = Array.isArray(b) ? b : [];
    return aa.length === bb.length && aa.every((value, index) => value === bb[index]);
  }
  return a === b;
};

/**
 * Mirrored catalog fields comparable against the upstream hive record, paired with the suggestion
 * field. `title`/`authors`/`identifiers` are excluded: they are the denormalized *published* subset, so
 * their divergence is judged against our last-published record (the companion's snapshot), not upstream.
 */
const compare = (
  catalog: Record<string, unknown> | undefined,
  suggestion: BookSuggestion,
): [string, unknown, unknown][] => [
  ['catalog.cover', catalog?.cover, suggestion.coverUrl],
  ['catalog.thumbnail', catalog?.thumbnail, suggestion.thumbnail],
  ['catalog.description', catalog?.description, suggestion.description],
  ['catalog.genres', catalog?.genres, suggestion.genres],
  ['catalog.language', catalog?.language, suggestion.language],
  ['catalog.numPages', catalog?.numPages, suggestion.numPages],
  ['catalog.publicationYear', catalog?.publicationYear, suggestion.publicationYear],
  ['catalog.publisher', catalog?.publisher, suggestion.publisher],
];

/**
 * Network-aware inspection of a Book's publish state, used by the companion.
 *
 * Eligibility is verified against the live BookHive catalog: a book with no hive link, or one we cannot
 * verify (offline, or the record is gone), is held back — since we cannot confirm it still matches a
 * hive record, we do not offer to publish. When verified, each catalog field whose local value diverges
 * from the upstream record is flagged (a local edit that stays private and is not pushed).
 */
export const inspectBook = async (object: unknown): Promise<PublishInspection> => {
  // The annotation is generically typed (`unknown`); only Books carry this closure.
  const book = object as Obj.Unknown;
  const hiveId = getHiveId(book);
  if (!hiveId) {
    // No hive link at all: the Mirrored catalog fields resolve to nothing upstream (definitive).
    return {
      eligibility: { ok: false, reason: 'This book is not linked to the BookHive catalog and cannot be published.' },
      mirrorResolved: false,
    };
  }

  // Without the network we cannot determine the catalog match, so the state is unknown (not a hard
  // ineligibility) and the mirror-resolution is left unchecked.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      eligibility: {
        ok: false,
        reason: 'No network connection — cannot verify the BookHive catalog.',
        unverifiable: true,
      },
    };
  }

  const suggestion = await EffectEx.runPromise(lookupHiveBook(hiveId, { corsProxy: browserCorsProxy() }));
  if (!suggestion) {
    // Verified against the catalog and the record is gone: definitively not in the catalog, so the
    // Mirrored fields are visible nowhere.
    return {
      eligibility: { ok: false, reason: 'This book is no longer in the BookHive catalog.' },
      mirrorResolved: false,
    };
  }

  const catalog = Obj.getValue(book, ['catalog']);
  const fieldNotes: Record<string, PublishFieldNote> = {};
  for (const [path, local, remote] of compare(catalog, suggestion)) {
    if (!isEmpty(local) && !equal(local, remote)) {
      fieldNotes[path] = { diverged: true };
    }
  }

  return { eligibility: { ok: true }, fieldNotes, mirrorResolved: true };
};
