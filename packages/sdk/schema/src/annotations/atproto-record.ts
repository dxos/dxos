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
 * `encode` MUST emit public fields only; the private-by-default invariant enforced by
 * {@link AtprotoPublishAnnotation} is the human half of the egress gate and this codec is
 * the machine half.
 */
export type AtprotoCodec = {
  /**
   * Project the ECHO object to its public atproto record (public fields only). Async because the
   * codec may be backed by a lazily-initialized engine (e.g. Panproto's WASM lens).
   */
  encode: (object: unknown) => Promise<Record<string, unknown>>;
  /** Reconstruct the ECHO-shaped fields from an atproto record. */
  decode: (record: Record<string, unknown>) => Promise<Record<string, unknown>>;
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
};

export const AtprotoRecordAnnotationId = Symbol.for('@dxos/schema/annotation/AtprotoRecord');
export const AtprotoRecordAnnotation = createAnnotationHelper<AtprotoRecord>(AtprotoRecordAnnotationId);
