//
// Copyright 2026 DXOS.org
//

import { createAnnotationHelper } from '@dxos/echo/internal';

/**
 * Bidirectional codec between an ECHO object and its atproto record projection.
 *
 * Typed over plain JSON records and the ECHO object only — deliberately free of any
 * `@atproto/lexicon` import so `@dxos/schema` stays dependency-light. The owning content
 * plugin supplies the concrete (Panproto-generated) codec when it defines its schema.
 *
 * `encode` MUST emit published fields only; the private-by-default invariant enforced by
 * {@link AtprotoVisibilityAnnotation} is the human half of the egress gate and this codec is
 * the machine half.
 */
/** An external-record foreign key (`{ source, id }`) to stamp on an object's meta. */
export type AtprotoForeignKey = { source: string; id: string };

export type AtprotoCodec = {
  /**
   * Project the ECHO object to its public atproto record (public fields only). Async because the
   * codec may be backed by a lazily-initialized engine (e.g. Panproto's WASM lens).
   */
  encode: (object: unknown) => Promise<Record<string, unknown>>;
  /** Reconstruct the ECHO-shaped fields from an atproto record. */
  decode: (record: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /**
   * Foreign keys to stamp on an object imported from a record — derived from the wire record itself
   * (e.g. an external catalog id the object should stay linked to). Keeps the generic import path free
   * of type-specific knowledge while letting a codec re-establish its links.
   */
  foreignKeys?: (record: Record<string, unknown>) => AtprotoForeignKey[];
  /**
   * Optional post-import enrichment, run (best-effort) after the imported object is added. The wire
   * record carries only what the lexicon publishes; a type may fetch the rest from its source (e.g. a
   * book fills its catalog metadata from the linked hive record). Failures are ignored.
   */
  onImport?: (object: unknown) => Promise<void>;
};

/**
 * Whether an object is currently eligible to be published, with a human-readable reason when not.
 * Returned by {@link AtprotoRecord.canPublish} so the companion can disable the publish action and
 * explain why (e.g. a Book that is not in the BookHive catalog has no `hiveId` to publish under).
 *
 * `unverifiable` distinguishes "we could not determine eligibility" (offline / upstream unreachable)
 * from a definitive "not publishable" — the companion renders the former as an "unknown" status rather
 * than a hard ineligibility, since the true state is simply not knowable right now.
 */
export type PublishEligibility = { ok: true } | { ok: false; reason: string; unverifiable?: boolean };

/** A per-field note for the companion's network view. */
export type PublishFieldNote = {
  /** The field's local value diverges from the mirrored upstream record (a local edit that is not pushed). */
  diverged?: boolean;
};

/**
 * A network-aware inspection of an object's publish state: a possibly-refined eligibility (e.g. a book
 * whose catalog link cannot be verified while offline) plus per-field notes (e.g. local edits that
 * diverge from the upstream catalog and are not pushed).
 */
export type PublishInspection = {
  eligibility: PublishEligibility;
  /** Notes keyed by JSONPath (e.g. `catalog.description`). */
  fieldNotes?: Record<string, PublishFieldNote>;
  /**
   * Whether the upstream record that Mirrored fields resolve from could be verified. `false` means the
   * link is unresolved (e.g. the book is not in the upstream catalog), so Mirrored fields are in fact
   * visible nowhere; `undefined` when not applicable or not checked (e.g. offline). Lets the companion
   * warn that Mirrored fields are not actually reaching the network.
   */
  mirrorResolved?: boolean;
};

/**
 * Declares that an ECHO type maps to an atproto lexicon record.
 *
 * Set on the schema struct (type-level) so the generic atproto companion can discover a
 * publishable object purely from its type. Mirrors how `OptionsLookupAnnotation` carries a
 * closure: the annotation type lives in the shared package, the value/closure is supplied by
 * the content plugin.
 */
export type AtprotoRecord = {
  /** Lexicon NSID of the target collection, e.g. `buzz.bookhive.book`. */
  collection: string;
  /** Record key strategy; `tid` mints a timestamp id, `self` uses a singleton key. */
  rkey?: 'tid' | 'self';
  /** Codec projecting the object to/from the lexicon record. */
  codec: AtprotoCodec;
  /**
   * Optional publish-eligibility gate, evaluated before publish is offered. Absent ⇒ always eligible.
   * The codec's {@link AtprotoCodec.encode} is the machine egress gate; this is the "may I publish at
   * all" gate (a valid record cannot be produced, or would be rejected by the network). Synchronous —
   * the actual publish path uses this; for richer, network-aware UI state use {@link inspect}.
   */
  canPublish?: (object: unknown) => PublishEligibility;
  /**
   * Optional async, network-aware inspection used by the companion for richer state: a refined
   * eligibility and per-field publish notes (e.g. divergence from an upstream catalog). Absent ⇒ the
   * companion falls back to {@link canPublish}.
   */
  inspect?: (object: unknown) => Promise<PublishInspection>;
};

export const AtprotoRecordAnnotationId = Symbol.for('@dxos/schema/annotation/AtprotoRecord');
export const AtprotoRecordAnnotation = createAnnotationHelper<AtprotoRecord>(AtprotoRecordAnnotationId);
