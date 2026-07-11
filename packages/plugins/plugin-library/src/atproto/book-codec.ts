//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type AtprotoCodec } from '@dxos/schema';

import { getStructuralCodec } from './panproto';

/**
 * The `buzz.bookhive.book` lexicon encodes authors as a single tab-separated string; ECHO models them
 * as `string[]`. This encoding is a lexicon-level choice, so the array↔string adaptation lives here at
 * the projection boundary (not downstream of Panproto), keeping the Panproto step a pure structural map.
 */
const AUTHOR_SEPARATOR = '\t';

// buzz.bookhive.book stores `status` as a `buzz.bookhive.defs#<value>` knownValue reference; ECHO's
// Book.status is the bare literal. Map across the boundary (like authors) so both sides stay idiomatic.
const STATUS_PREFIX = 'buzz.bookhive.defs#';
const STATUSES = new Set(['finished', 'reading', 'wantToRead', 'abandoned']);

const toWireStatus = (status: string): string => `${STATUS_PREFIX}${status}`;
const fromWireStatus = (status: string): string | undefined => {
  const bare = status.startsWith(STATUS_PREFIX) ? status.slice(STATUS_PREFIX.length) : status;
  return STATUSES.has(bare) ? bare : undefined;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/**
 * Project a Book to the ECHO-side boundary record: public fields ONLY (the egress gate — private
 * fields are never read), authors joined to a tab string, and a stable `createdAt` from the object's
 * creation timestamp.
 */
const toBoundary = (object: Obj.Unknown): Record<string, unknown> => {
  const read = (field: string) => Obj.getValue(object, [field]);
  const createdMs = Obj.getMeta(object).createdAt ?? 0;

  const boundary: Record<string, unknown> = {
    title: asString(read('title')) ?? '',
    authors: asStringArray(read('authors')).join(AUTHOR_SEPARATOR),
    hiveId: asString(read('hiveId')) ?? '',
    createdAt: new Date(createdMs).toISOString(),
  };

  const optionalStrings: Record<string, unknown> = {
    review: asString(read('review')),
    startedAt: asString(read('startedAt')),
    finishedAt: asString(read('finishedAt')),
    hiveBookUri: asString(read('hiveBookUri')),
  };
  for (const [key, value] of Object.entries(optionalStrings)) {
    if (value !== undefined) {
      boundary[key] = value;
    }
  }
  const status = asString(read('status'));
  if (status !== undefined) {
    boundary.status = toWireStatus(status);
  }
  const stars = asNumber(read('stars'));
  if (stars !== undefined) {
    boundary.stars = stars;
  }
  return boundary;
};

// The public string fields carried 1:1 from the record to the ECHO Book.
const PASSTHROUGH_FIELDS = ['title', 'hiveId', 'review', 'startedAt', 'finishedAt', 'hiveBookUri'] as const;

/**
 * Reconstruct ECHO Book fields from the boundary record. Whitelists the mapped fields — the raw
 * atproto record carries `$type` (and may carry blob/ref fields) that Obj.make's exact-property
 * validation would reject, and `createdAt` has no ECHO home. authors → array; status → bare literal.
 */
const fromBoundary = (boundary: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of PASSTHROUGH_FIELDS) {
    const value = asString(boundary[key]);
    if (value !== undefined) {
      result[key] = value;
    }
  }
  const stars = asNumber(boundary.stars);
  if (stars !== undefined) {
    result.stars = stars;
  }
  result.authors =
    typeof boundary.authors === 'string' ? boundary.authors.split(AUTHOR_SEPARATOR).filter(Boolean) : [];
  const bareStatus = typeof boundary.status === 'string' ? fromWireStatus(boundary.status) : undefined;
  if (bareStatus !== undefined) {
    result.status = bareStatus;
  }
  return result;
};

/**
 * Book ↔ buzz.bookhive.book codec. Encode projects the public face to the boundary then runs the
 * Panproto structural lens; decode runs the reverse lens then un-projects. Wired into the Book type's
 * {@link AtprotoRecordAnnotation}.
 */
export const bookCodec: AtprotoCodec = {
  encode: async (object) => {
    // The annotation codec is generically typed (`unknown`); this codec only ever receives Books.
    const boundary = toBoundary(object as Obj.Unknown);
    const engine = await getStructuralCodec();
    return engine.encode(boundary);
  },
  decode: async (record) => {
    const engine = await getStructuralCodec();
    return fromBoundary(engine.decode(record));
  },
};
