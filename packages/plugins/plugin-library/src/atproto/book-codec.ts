//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { type AtprotoCodec, type PublishEligibility, Text } from '@dxos/schema';

import { enrichBook } from './enrich';
import { getHiveId } from './hive';
import { decodeBookScalars, encodeBookScalars } from './panproto';
import { htmlToMarkdown, markdownToHtml } from '../operations/html-markdown';

// The `buzz.bookhive.book` lexicon encodes authors as a single tab-separated string; ECHO models them
// as `string[]`. This array<->string adaptation is structural (not a scalar value transform), so it
// lives here in the codec, not in the Panproto bridge.
const AUTHOR_SEPARATOR = '\t';

// The flat, scalar-only fields shared with `echo.book` (the Panproto bridge lexicon). Ref-typed wire
// fields (identifiers, bookProgress) are adapted structurally, outside the bridge.
const FLAT_KEYS = ['title', 'authors', 'hiveId', 'createdAt', 'status', 'stars', 'review', 'startedAt', 'finishedAt', 'owned'] as const;

const STATUSES = new Set(['finished', 'reading', 'wantToRead', 'abandoned']);

// BookHive's catalog service account, which owns the canonical `buzz.bookhive.catalogBook` records
// (observed on records published by BookHive itself). The published book's `hiveBookUri` points here.
const BOOKHIVE_SERVICE_DID = 'did:plc:enu2j5xjlqsjaylv3du4myh4';

//
// Scalar readers. On the ECHO side, nested struct values come from `Obj.getValue` (untyped at the
// boundary); on the wire side, values come from a plain JSON record.
//

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/** Coerce an unknown wire value to a plain record so its properties can be read (empty when not one). */
const objectOf = (value: unknown): Record<string, unknown> =>
  value != null && typeof value === 'object' ? Object.fromEntries(Object.entries(value)) : {};
const readString = (record: Record<string, unknown>, key: string): string | undefined => asString(record[key]);
const readNumber = (record: Record<string, unknown>, key: string): number | undefined => asNumber(record[key]);

/** Resolve a `Ref<Text>` to its non-empty content, or undefined (empty reviews are not published). */
const loadTextContent = async (ref?: Ref.Ref<Text.Text>): Promise<string | undefined> => {
  const text = await ref?.load();
  return text && text.content.trim().length > 0 ? text.content : undefined;
};

/**
 * Project a Book to its `buzz.bookhive.book` record. Reads the public face only (the egress gate);
 * denormalizes the published `catalog` subset (title/authors/identifiers), joins authors, resolves the
 * `review` Text ref (markdown -> the wire's HTML), stamps `createdAt` from the object's creation time,
 * and reads the `hiveId` from
 * `catalog.identifiers` (one of the catalog identifiers). The bare `status` is prefixed to its
 * knownValue reference by the Panproto bridge; the ref-typed `identifiers`/`bookProgress` are attached
 * after.
 */
const encode: AtprotoCodec['encode'] = async (object) => {
  // The annotation codec is generically typed (`unknown`); only Books reach here.
  const book = object as Obj.Unknown;
  // Nested struct values are untyped at the ECHO boundary (`getValue` returns `any`).
  const catalog = Obj.getValue(book, ['catalog']);
  const createdMs = Obj.getMeta(book).createdAt ?? 0;
  const hiveId = getHiveId(book);

  const record: Record<string, unknown> = {
    title: asString(catalog?.title) ?? '',
    authors: asStringArray(catalog?.authors).join(AUTHOR_SEPARATOR),
    hiveId: hiveId ?? '',
    createdAt: new Date(createdMs).toISOString(),
  };

  const status = asString(Obj.getValue(book, ['status']));
  if (status) {
    record.status = status; // Bare; prefixed to the knownValue reference by the bridge below.
  }
  const stars = asNumber(Obj.getValue(book, ['stars']));
  if (stars !== undefined) {
    record.stars = stars;
  }
  // The wire stores the review as HTML (BookHive's format); ECHO holds markdown, mapped like description.
  const review = markdownToHtml(await loadTextContent(Obj.getValue(book, ['review'])));
  if (review) {
    record.review = review;
  }
  const startedAt = asString(Obj.getValue(book, ['startedAt']));
  if (startedAt) {
    record.startedAt = startedAt;
  }
  const finishedAt = asString(Obj.getValue(book, ['finishedAt']));
  if (finishedAt) {
    record.finishedAt = finishedAt;
  }
  const owned = Obj.getValue(book, ['owned']);
  if (typeof owned === 'boolean') {
    record.owned = owned;
  }

  // Scalar value transforms (declarative, panproto): status -> knownValue reference, dates widened
  // to the wire's ISO datetime format.
  const wire = await encodeBookScalars(record);

  // Ref-typed lexicon fields (`buzz.bookhive.defs#*`) are structural — attached after the scalar
  // bridge, which only handles flat scalars. `identifiers` carries the hive id per the def.
  const identifiers: Record<string, unknown> = {};
  if (hiveId) {
    identifiers.hiveId = hiveId;
  }
  for (const key of ['isbn10', 'isbn13', 'goodreadsId'] as const) {
    const value = asString(catalog?.identifiers?.[key]);
    if (value) {
      identifiers[key] = value;
    }
  }
  if (Object.keys(identifiers).length > 0) {
    wire.identifiers = identifiers;
  }

  // Link the published book to its canonical BookHive catalog record — how BookHive ingests and
  // associates the record. `rkey` of the catalogBook is the hive id.
  if (hiveId) {
    wire.hiveBookUri = `at://${BOOKHIVE_SERVICE_DID}/buzz.bookhive.catalogBook/${hiveId}`;
  }

  const progress = Obj.getValue(book, ['progress']);
  if (progress != null) {
    const bookProgress: Record<string, unknown> = {};
    for (const key of ['percent', 'totalPages', 'currentPage', 'totalChapters', 'currentChapter'] as const) {
      const value = asNumber(progress?.[key]);
      if (value !== undefined) {
        bookProgress[key] = value;
      }
    }
    const explicitUpdatedAt = asString(progress?.updatedAt);
    if (Object.keys(bookProgress).length > 0 || explicitUpdatedAt) {
      // `updatedAt` is required on the wire; stamp deterministically from creation time when unset.
      bookProgress.updatedAt = explicitUpdatedAt ?? new Date(createdMs).toISOString();
      wire.bookProgress = bookProgress;
    }
  }

  return wire;
};

/**
 * Reconstruct ECHO-shaped Book fields from a `buzz.bookhive.book` record. Nests the denormalized
 * catalog subset back under `catalog` (title/authors/identifiers, including `hiveId`), splits authors
 * to an array, un-prefixes `status`, wraps `review` as a `Text` ref, and renames `bookProgress` to
 * `progress`. `createdAt` has no ECHO home (it is object meta), so it is dropped.
 */
const decode: AtprotoCodec['decode'] = async (record) => {
  const flat: Record<string, unknown> = {};
  for (const key of FLAT_KEYS) {
    if (record[key] !== undefined) {
      flat[key] = record[key];
    }
  }
  const scalar = await decodeBookScalars(flat);

  const catalog: Record<string, unknown> = {
    title: readString(scalar, 'title') ?? '',
    authors: typeof scalar.authors === 'string' ? scalar.authors.split(AUTHOR_SEPARATOR).filter(Boolean) : [],
  };
  const wireIdentifiers = objectOf(record.identifiers);
  const identifiers: Record<string, unknown> = {};
  // The required top-level `hiveId` is the canonical dedup key; fall back to the one in `identifiers`.
  const hiveId = readString(record, 'hiveId') ?? readString(wireIdentifiers, 'hiveId');
  if (hiveId) {
    identifiers.hiveId = hiveId;
  }
  for (const key of ['isbn10', 'isbn13', 'goodreadsId'] as const) {
    const value = readString(wireIdentifiers, key);
    if (value) {
      identifiers[key] = value;
    }
  }
  if (Object.keys(identifiers).length > 0) {
    catalog.identifiers = identifiers;
  }

  const result: Record<string, unknown> = { catalog };

  const status = readString(scalar, 'status');
  if (status && STATUSES.has(status)) {
    result.status = status;
  }
  const stars = readNumber(scalar, 'stars');
  if (stars !== undefined) {
    result.stars = stars;
  }
  // Always attach a review Text (even when the wire carries none) so an imported book has an inline
  // editor target, matching `Book.make`. Wire HTML maps back to markdown.
  result.review = Ref.make(Text.make({ content: htmlToMarkdown(readString(scalar, 'review')) ?? '' }));
  const startedAt = readString(scalar, 'startedAt');
  if (startedAt) {
    result.startedAt = startedAt;
  }
  const finishedAt = readString(scalar, 'finishedAt');
  if (finishedAt) {
    result.finishedAt = finishedAt;
  }
  if (typeof scalar.owned === 'boolean') {
    result.owned = scalar.owned;
  }

  const wireProgress = objectOf(record.bookProgress);
  const progress: Record<string, unknown> = {};
  for (const key of ['percent', 'totalPages', 'currentPage', 'totalChapters', 'currentChapter'] as const) {
    const value = readNumber(wireProgress, key);
    if (value !== undefined) {
      progress[key] = value;
    }
  }
  const updatedAt = readString(wireProgress, 'updatedAt');
  if (updatedAt) {
    progress.updatedAt = updatedAt;
  }
  if (Object.keys(progress).length > 0) {
    result.progress = progress;
  }

  return result;
};

/**
 * Book <-> buzz.bookhive.book codec. Two layers: this structural adapter (refs, arrays, object meta,
 * catalog flatten/nest, progress rename) plus the declarative Panproto bridge for the `status`/date
 * scalar value transforms. Wired into the Book type's {@link AtprotoRecordAnnotation}. No `foreignKeys`:
 * the `hiveId` is a catalog identifier (`catalog.identifiers.hiveId`), not an ECHO sync foreign key.
 */
export const bookCodec: AtprotoCodec = { encode, decode, onImport: enrichBook };

/**
 * Publish eligibility for a Book: only books linked to a BookHive catalog record (a `hiveId` foreign
 * key stamped by autofill) can be published, since BookHive's ingester drops records whose hive id is
 * not in its catalog. Custom books have no link and are held back. This is the synchronous gate the
 * publish path uses; the companion additionally verifies against the live catalog via `inspectBook`.
 */
export const canPublishBook = (object: unknown): PublishEligibility => {
  // The annotation is generically typed (`unknown`); only Books carry this closure.
  return getHiveId(object as Obj.Unknown)
    ? { ok: true }
    : { ok: false, reason: 'This book is not linked to the BookHive catalog and cannot be published.' };
};
