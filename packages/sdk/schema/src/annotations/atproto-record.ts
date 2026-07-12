//
// Copyright 2026 DXOS.org
//

import { type Panproto } from '@dxos/echo-panproto';
import { createAnnotationHelper } from '@dxos/echo/internal';

/** An external-record foreign key (`{ source, id }`) to stamp on an object's meta. */
export type AtprotoForeignKey = { source: string; id: string };

/**
 * Whether an object is currently eligible to be published, with a human-readable reason when not.
 * Returned by {@link AtprotoPolicy.canPublish} so the companion can disable the publish action and
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
 * Declares that an ECHO type maps to an atproto lexicon record via a declarative {@link Panproto.Lens}.
 *
 * Set on the schema struct (type-level) so the generic atproto companion can discover a publishable
 * object purely from its type. The mapping is serializable DATA (a `Panproto.Lens`), not a closure — the
 * runner (`Panproto.encode`/`decode`) executes it. Publish policy (which cannot be data) lives on the
 * separate {@link AtprotoPolicyAnnotation}.
 */
export type AtprotoRecord = {
  /** Lexicon NSID of the target collection, e.g. `buzz.bookhive.book`. */
  collection: string;
  /** Record key strategy; `tid` mints a timestamp id, `self` uses a singleton key. */
  rkey?: 'tid' | 'self';
  /** The declarative, serializable ECHO<->record lens. */
  lens: Panproto.Lens;
};

export const AtprotoRecordAnnotationId = Symbol.for('@dxos/schema/annotation/AtprotoRecord');
export const AtprotoRecordAnnotation = createAnnotationHelper<AtprotoRecord>(AtprotoRecordAnnotationId);

/**
 * Publish policy for an atproto-mapped type — the closures that cannot be expressed as lens data:
 * eligibility gating, network-aware inspection, and post-import enrichment. Carried on a separate
 * annotation (like `OptionsLookupAnnotation`) so the serializable {@link AtprotoRecordAnnotation} stays
 * closure-free. All optional; absent hooks fall back to permissive defaults.
 */
export type AtprotoPolicy = {
  /**
   * Publish-eligibility gate, evaluated before publish is offered. Absent ⇒ always eligible. Synchronous;
   * the actual publish path uses this. For richer, network-aware UI state use {@link inspect}.
   */
  canPublish?: (object: unknown) => PublishEligibility;
  /**
   * Async, network-aware inspection used by the companion for richer state: a refined eligibility and
   * per-field publish notes (e.g. divergence from an upstream catalog). Absent ⇒ falls back to {@link canPublish}.
   */
  inspect?: (object: unknown) => Promise<PublishInspection>;
  /**
   * Post-import enrichment, run (best-effort) after an imported object is added. The wire record carries
   * only what the lexicon publishes; a type may fetch the rest from its source. Failures are ignored.
   */
  onImport?: (object: unknown) => Promise<void>;
  /**
   * Foreign keys to stamp on an object imported from a record — derived from the wire record itself
   * (e.g. an external catalog id the object should stay linked to).
   */
  foreignKeys?: (record: Record<string, unknown>) => AtprotoForeignKey[];
};

export const AtprotoPolicyAnnotationId = Symbol.for('@dxos/schema/annotation/AtprotoPolicy');
export const AtprotoPolicyAnnotation = createAnnotationHelper<AtprotoPolicy>(AtprotoPolicyAnnotationId);
