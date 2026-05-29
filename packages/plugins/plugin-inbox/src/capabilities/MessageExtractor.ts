//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import { type Operation } from '@dxos/compute';
import { type Database, type Obj, type Relation } from '@dxos/echo';
import { type Message } from '@dxos/types';

export type MatchResult = {
  matched: boolean;
  confidence?: number;
  reason?: string;
};

/**
 * Uniform input shape every extractor operation receives. The dispatcher
 * (`ExtractMessage`) invokes per-extractor operations with this exact payload, so
 * extractors that need extra context (e.g. travel needs `targetTripId`) accept it
 * via this same struct and ignore it when not relevant.
 *
 * Runtime Schema lives in `types/InboxOperation.ts` (re-exported as `ExtractInputSchema`)
 * — splitting schema construction out of this module avoids a load-order cycle between
 * `@dxos/echo` and `@dxos/types` when this module is imported transitively from a test.
 */
export interface ExtractInput {
  readonly db: Database.Database;
  readonly message: Message.Message;
  readonly targetTripId?: string;
}

/**
 * Output every extractor operation produces. Extractor operations DO NOT touch the database
 * — they return descriptions of what should happen. The dispatcher (`ExtractMessage`) is the
 * single place that calls `db.add` and attaches `ExtractedFrom` relations, which lets manual
 * invocations interpose a preview/edit/cancel UI before the writes commit (see task #6).
 *
 * - `created`: objects the dispatcher should `db.add`.
 * - `updated`: objects the extractor already mutated in place (Obj.update); the dispatcher
 *   does NOT re-add them but still attaches an `ExtractedFrom` for provenance.
 * - `relations`: extra relations to persist verbatim.
 * - `summary`: human-readable one-line summary for the UI/log.
 */
export interface ExtractResult {
  readonly created: ReadonlyArray<Obj.Any>;
  readonly updated?: ReadonlyArray<Obj.Any>;
  readonly relations: ReadonlyArray<Relation.Unknown>;
  /**
   * Tags to apply to the source message after extraction completes. The dispatcher
   * find-or-creates each entry in the owning Mailbox's `tags` map and pushes a `Ref` to the
   * message into the entry's `messages` array. Idempotent — duplicate tags on the same
   * message are no-ops.
   */
  readonly tags?: ReadonlyArray<{ label: string; hue?: string }>;
  readonly summary?: string;
}

export class ExtractError {
  readonly _tag = 'ExtractError';
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

/**
 * A MessageExtractor carries:
 *  - identification metadata (`id`, `description`, `kinds`),
 *  - a synchronous `match` predicate used to populate the toolbar / pick the right extractor,
 *  - a pointer to the registered `Operation.Definition` so each extractor is a first-class,
 *    history-traceable operation invocable via the OperationInvoker, and
 *  - an inline `extract` function that runs the same extraction logic without going through
 *    the OperationInvoker. The dispatcher (`ExtractMessage`) uses `extract` directly so the
 *    extraction step doesn't depend on `Operation.Service`, which keeps test setup light and
 *    lets the dispatcher interpose the upcoming preview/edit/cancel UI (task #6) between
 *    extraction and persistence. The handler registered for `operation` is just
 *    `Operation.withHandler(extract)` — same logic, two callable surfaces.
 */
export interface MessageExtractor {
  readonly id: string;
  /** Short, human-readable title for menus/toolbars (e.g. "Trip", "Contact"). */
  readonly title: string;
  readonly description: string;
  readonly kinds: readonly string[];
  match(message: Message.Message): MatchResult;
  readonly operation: Operation.Definition<ExtractInput, ExtractResult>;
  /**
   * R includes `Operation.Service` so AI-backed extractors (e.g. summarize) can delegate the
   * heavy lifting to a dedicated operation via `Operation.invoke(...)` — that operation
   * declares the services it needs (e.g. `AiService.AiService`) so per-extractor service
   * requirements stay out of the dispatcher's operation declaration. `Operation.Service` is
   * auto-available in any operation handler context, so the dispatcher's `yield*` propagates
   * cleanly. Extractors that don't invoke nested operations still satisfy this signature
   * because `never` is assignable to `Operation.Service` in the covariant R position.
   */
  extract(input: ExtractInput): Effect.Effect<ExtractResult, ExtractError, Operation.Service>;
  /**
   * Whether the dispatcher should attach an `ExtractedFrom` relation from each top-level
   * created/updated object back to the source message.
   *
   * Defaults to `true`. Set to `false` for extractors whose output is already linked to the
   * message by some other field — e.g. the contact extractor materialises `msg.sender` into
   * a Person, and `Message.sender` already references that actor, so a separate
   * `ExtractedFrom` edge would be redundant.
   */
  readonly createRelation?: boolean;
}
