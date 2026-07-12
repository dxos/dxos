//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Database, Obj, Relation, type Type } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector';
import { type AtprotoCodec, type PublishEligibility, type PublishInspection } from '@dxos/schema';

import { getRecordAnnotation } from './annotation';
import { AtprotoRepoError, NotPublishableError } from './errors';
import { computePublishedValues } from './field-values';
import { ATPROTO_SOURCE, atprotoForeignKey } from './foreign-key';
import { hashRecord } from './hash';
import * as AtprotoRepo from './services/AtprotoRepo';
import { AtprotoPublication } from '#types';

/** Whether an object is unpublished, published-and-in-sync, or published-but-stale. */
export type PublishStatus = 'unpublished' | 'published' | 'outOfDate';

/**
 * The headline state shown by the companion, combining the publication-relative {@link PublishStatus}
 * with network-aware eligibility ({@link PublishInspection}):
 * - `unknown` — eligibility is unverifiable (offline / upstream unreachable); we cannot determine the
 *   true state, so this overrides `published`/`outOfDate`.
 * - `ineligible` — not published and definitively not publishable (e.g. no catalog link).
 * - `ready` — not published and eligible to publish now.
 * - `published` — published and in sync with what we would publish.
 * - `outOfDate` — published but a Published field has changed locally since.
 */
export type DisplayStatus = 'unknown' | 'ineligible' | 'ready' | 'published' | 'outOfDate';

/**
 * Derive the companion's headline {@link DisplayStatus} from the publication-relative status and the
 * network-aware eligibility. Unverifiable eligibility wins (we cannot trust any determination); an
 * unpublished object then splits into `ready`/`ineligible` by whether it may be published right now.
 */
export const deriveDisplayStatus = (status: PublishStatus, eligibility: PublishEligibility): DisplayStatus => {
  if (!eligibility.ok && eligibility.unverifiable) {
    return 'unknown';
  }
  if (status !== 'unpublished') {
    return status;
  }
  return eligibility.ok ? 'ready' : 'ineligible';
};

/** Encode an object to its public atproto record via its type's codec, if publishable. */
export const encodeRecord = async (object: Obj.Unknown): Promise<Record<string, unknown> | undefined> =>
  getRecordAnnotation(object)?.codec.encode(object);

/**
 * Whether an object may be published right now. An object with no atproto record annotation is not
 * publishable; otherwise its type's optional {@link AtprotoRecord.canPublish} gate decides (absent ⇒
 * eligible). Used by the companion to enable/disable publish and by {@link publishObject} to refuse.
 */
export const getPublishEligibility = (object: Obj.Unknown): PublishEligibility => {
  const annotation = getRecordAnnotation(object);
  if (!annotation) {
    return { ok: false, reason: 'This object cannot be published.' };
  }
  return annotation.canPublish?.(object) ?? { ok: true };
};

/**
 * Network-aware publish inspection for the companion: prefers the type's async {@link AtprotoRecord.inspect}
 * (refined eligibility + per-field notes), falling back to the synchronous {@link getPublishEligibility}.
 */
export const inspectPublish = async (object: Obj.Unknown): Promise<PublishInspection> => {
  const annotation = getRecordAnnotation(object);
  if (!annotation) {
    return { eligibility: { ok: false, reason: 'This object cannot be published.' } };
  }
  if (annotation.inspect) {
    return annotation.inspect(object);
  }
  return { eligibility: annotation.canPublish?.(object) ?? { ok: true } };
};

/** Compare a fresh encoding against the last-published hash to derive publish status. */
export const computeStatus = async (
  object: Obj.Unknown,
  publication?: AtprotoPublication.AtprotoPublication,
): Promise<PublishStatus> => {
  if (!publication) {
    return 'unpublished';
  }
  const record = await encodeRecord(object);
  return record && hashRecord(record) === publication.publishedHash ? 'published' : 'outOfDate';
};

const RKEY_ALPHABET = '234567abcdefghijklmnopqrstuvwxyz';

/**
 * Mint a 13-char, timestamp-sortable atproto TID. The 64-bit value is a 53-bit microsecond timestamp in
 * the high bits with a 10-bit clock identifier in the low bits (`micros << 10 | clockId`); omitting the
 * shift produces a ~1024×-too-small timestamp that decodes to 1970.
 */
const mintTid = (nowMs: number): string => {
  let value = ((BigInt(nowMs) * 1000n) << 10n) | BigInt(Math.floor(Math.random() * 1024));
  let key = '';
  for (let index = 0; index < 13; index++) {
    key = RKEY_ALPHABET[Number(value & 31n)] + key;
    value >>= 5n;
  }
  return key;
};

/** Stamp the atproto foreign key on an object (idempotent) so re-publish/import recognizes it. */
const stampForeignKey = (object: Obj.Unknown, uri: string): void => {
  Obj.update(object, (object) => {
    const keys = Obj.getMeta(object).keys;
    if (!keys.some((key) => key.source === ATPROTO_SOURCE && key.id === uri)) {
      keys.push(atprotoForeignKey(uri));
    }
  });
};

type Binding = {
  uri: string;
  cid: string;
  collection: string;
  rkey: string;
  publishedHash: string;
  /** Display snapshot of each Published leaf field, for per-field divergence detection. */
  publishedValues: Record<string, string>;
  publishedAt: string;
};

/**
 * Create/replace the object's {@link AtprotoPublication} and stamp its atproto foreign key. The single
 * source of "this object is published to this repo" — shared by publish and import so both leave the
 * object in the same, re-publishable state.
 */
const bindPublication = (
  object: Obj.Unknown,
  connection: Connection.Connection,
  db: Database.Database,
  binding: Binding,
  existing?: AtprotoPublication.AtprotoPublication,
): AtprotoPublication.AtprotoPublication => {
  stampForeignKey(object, binding.uri);
  // Relation fields are immutable post-creation, so a re-publish replaces the relation.
  if (existing) {
    db.remove(existing);
  }
  const publication = AtprotoPublication.make({
    [Relation.Source]: connection,
    [Relation.Target]: object,
    ...binding,
  });
  db.add(publication);
  return publication;
};

export type PublishOptions = {
  object: Obj.Unknown;
  connection: Connection.Connection;
  db: Database.Database;
  /** Existing publication for a re-publish; absent for a first publish. */
  existing?: AtprotoPublication.AtprotoPublication;
  /** Fixed clock for deterministic tests. */
  now?: number;
};

/**
 * Publish (or re-publish) an object's public projection to the connected atproto repo, then bind it.
 * Requires an {@link AtprotoRepo} — tests provide the mock.
 */
export const publishObject = ({
  object,
  connection,
  db,
  existing,
  now,
}: PublishOptions): Effect.Effect<
  AtprotoPublication.AtprotoPublication,
  NotPublishableError | AtprotoRepoError,
  AtprotoRepo.Service
> =>
  Effect.gen(function* () {
    const annotation = getRecordAnnotation(object);
    if (!annotation) {
      return yield* Effect.fail(new NotPublishableError({}));
    }
    // Refuse ineligible objects (e.g. a Book not in the BookHive catalog) before touching the repo.
    const eligibility = annotation.canPublish?.(object) ?? { ok: true };
    if (!eligibility.ok) {
      return yield* Effect.fail(new NotPublishableError({ message: eligibility.reason }));
    }

    const timestamp = now ?? Date.now();
    const record = yield* Effect.tryPromise({
      try: () => annotation.codec.encode(object),
      catch: (cause) => new AtprotoRepoError({ message: 'Failed to encode record.', cause }),
    });
    const collection = annotation.collection;
    const rkey = existing?.rkey ?? (annotation.rkey === 'self' ? 'self' : mintTid(timestamp));

    const repo = yield* AtprotoRepo.Service;
    const { uri, cid } = yield* repo.putRecord({ collection, rkey, record });

    // Snapshot the published field values (best-effort) so the companion can flag per-field divergence.
    const publishedValues = yield* Effect.promise(() => computePublishedValues(object));

    return bindPublication(
      object,
      connection,
      db,
      {
        uri,
        cid,
        collection,
        rkey,
        publishedHash: hashRecord(record),
        publishedValues,
        publishedAt: new Date(timestamp).toISOString(),
      },
      existing,
    );
  });

export type UnpublishOptions = {
  publication: AtprotoPublication.AtprotoPublication;
  db: Database.Database;
};

/**
 * Delete the published record from the atproto repo and remove its {@link AtprotoPublication}.
 */
export const unpublishObject = ({
  publication,
  db,
}: UnpublishOptions): Effect.Effect<void, AtprotoRepoError, AtprotoRepo.Service> =>
  Effect.gen(function* () {
    const repo = yield* AtprotoRepo.Service;
    yield* repo.deleteRecord({ collection: publication.collection, rkey: publication.rkey });
    db.remove(publication);
  });

export type ImportOptions = {
  /** Registered ECHO type mapped to the record's collection. */
  type: Type.AnyObj;
  codec: AtprotoCodec;
  collection: string;
  record: AtprotoRepo.RepoRecord;
  /** Connection the record belongs to — when present, the import is bound as published to it. */
  connection?: Connection.Connection;
  db: Database.Database;
  now?: number;
};

/**
 * Import a repo record into the space as a live ECHO object of its mapped type. Always stamps the
 * atproto foreign key (record AT-URI). When a `connection` is given (the record belongs to a
 * connected account), it is additionally bound as an in-sync {@link AtprotoPublication} — so the
 * companion shows it published and a future re-publish overwrites the same record.
 */
export const importRecord = ({
  type,
  codec,
  collection,
  record,
  connection,
  db,
  now,
}: ImportOptions): Effect.Effect<
  { object: Obj.Unknown; publication?: AtprotoPublication.AtprotoPublication },
  AtprotoRepoError,
  never
> =>
  Effect.gen(function* () {
    const decoded = yield* Effect.tryPromise({
      try: () => codec.decode(record.value),
      catch: (cause) => new AtprotoRepoError({ message: 'Failed to decode record.', cause }),
    });
    // The record's AT-URI plus any type-specific foreign keys the codec derives (e.g. an external
    // catalog id the object should stay linked to).
    const foreignKeys = [atprotoForeignKey(record.uri), ...(codec.foreignKeys?.(record.value) ?? [])];
    const object = db.add(Obj.make(type, { ...decoded, [Obj.Meta]: { keys: foreignKeys } }));

    // Best-effort enrichment: fill fields the lexicon does not carry from the object's source (e.g. a
    // book's catalog metadata from the linked hive record). Never fails the import.
    if (codec.onImport) {
      yield* Effect.tryPromise(() => codec.onImport!(object)).pipe(Effect.ignore);
    }

    if (!connection) {
      // Imported from an arbitrary (not-connected) repo: keep the foreign key, but don't claim it as
      // published to one of our connections.
      return { object };
    }
    // Bind as in-sync against what WE would publish, so the companion reads "published (in sync)".
    const encoded = yield* Effect.tryPromise({
      try: () => codec.encode(object),
      catch: (cause) => new AtprotoRepoError({ message: 'Failed to encode imported object.', cause }),
    });
    const publishedValues = yield* Effect.promise(() => computePublishedValues(object));
    const publication = bindPublication(object, connection, db, {
      uri: record.uri,
      cid: record.cid,
      collection,
      rkey: record.rkey,
      publishedHash: hashRecord(encoded),
      publishedValues,
      publishedAt: new Date(now ?? Date.now()).toISOString(),
    });
    return { object, publication };
  });
