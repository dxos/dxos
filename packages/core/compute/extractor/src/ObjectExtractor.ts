//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { type Operation } from '@dxos/compute';
import { type Database, type Obj, type Relation } from '@dxos/echo';

import { type Resolver } from './Resolver';

export type MatchResult = {
  matched: boolean;
  confidence?: number;
  reason?: string;
};

/**
 * Uniform input shape every extractor receives. The dispatcher invokes per-extractor logic
 * with this exact payload. Generalised over any source ECHO object (a `Message`, a calendar
 * `Event`, …) — not just messages.
 */
export interface ExtractInput {
  readonly db: Database.Database;
  readonly source: Obj.Any;
}

/**
 * Output every extractor produces. Extractors DO NOT touch the database — they return
 * descriptions of what should happen. The dispatcher is the single place that calls `db.add`
 * and attaches provenance relations, which lets manual invocations interpose a
 * preview/edit/cancel UI (via `onProposal`) before the writes commit.
 *
 * - `created`: objects the dispatcher should `db.add`.
 * - `updated`: objects the extractor already mutated in place (`Obj.update`); the dispatcher
 *   does NOT re-add them but still attaches provenance.
 * - `relations`: extra relations to persist verbatim.
 * - `tags`: opaque tag descriptors interpreted by the consuming plugin (e.g. applied to the
 *   owning Mailbox by the inbox bridge) — the core dispatcher does not interpret these.
 * - `summary`: human-readable one-line summary for the UI/log.
 */
export interface ExtractResult {
  readonly created: ReadonlyArray<Obj.Any>;
  readonly updated?: ReadonlyArray<Obj.Any>;
  readonly relations: ReadonlyArray<Relation.Unknown>;
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
 * An ObjectExtractor carries:
 *  - identification metadata (`id`, `description`, `kinds`),
 *  - `sourceTypes`: the ECHO typename(s) of sources it applies to, so the dispatcher can
 *    pre-filter candidates before calling `match`,
 *  - a synchronous `match` predicate used to pick the right extractor / populate a toolbar,
 *  - a pointer to the registered `Operation.Definition` so each extractor is a first-class,
 *    history-traceable operation, and
 *  - an inline `extract` function that runs the same logic without the OperationInvoker. The
 *    dispatcher uses `extract` directly so extraction doesn't depend on `Operation.Service`,
 *    which keeps test setup light and lets the dispatcher interpose `onProposal` between
 *    extraction and persistence.
 */
export interface ObjectExtractor {
  readonly id: string;
  readonly description: string;
  readonly kinds: readonly string[];
  /** ECHO typename(s) of the source objects this extractor applies to (e.g. the Message typename). */
  readonly sourceTypes: readonly string[];
  match(source: Obj.Any): MatchResult;
  /**
   * Optional pointer to a registered operation so the extractor is also invocable as a
   * first-class, history-traceable operation (e.g. from the OperationInvoker / agents). The
   * dispatcher does not use this — it calls `extract` directly.
   */
  readonly operation?: Operation.Definition<ExtractInput, ExtractResult>;
  /**
   * R includes:
   *  - `Operation.Service` (auto-available in any operation handler context),
   *  - `Resolver` for identity-based merge (template / get-or-create extractors), and
   *  - `AiService.AiService` for LLM-backed extractors (summarize, template).
   * The consuming dispatcher's operation declares `AiService` in its services and provides the
   * `Resolver` layer, so these requirements are satisfied where `dispatch` is invoked.
   * Extractors that need none of these still satisfy this signature (`never` is assignable).
   */
  extract(
    input: ExtractInput,
  ): Effect.Effect<ExtractResult, ExtractError, Operation.Service | Resolver | AiService.AiService>;
  /**
   * Whether the dispatcher should attach a provenance relation from each top-level
   * created/updated object back to the source. Defaults to `true`. Set `false` when the output
   * is already linked to the source by some other field (e.g. a contact materialised from
   * `message.sender`, which the Message schema already references).
   */
  readonly createRelation?: boolean;
}
