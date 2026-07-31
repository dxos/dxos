//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import { type Database } from '@dxos/echo';

/** Summary produced by the summarize stage. */
export type Summary = { readonly summary: string; readonly isSpam: boolean; readonly keywords: readonly string[] };

/** Running tallies produced by the stats stage (mutable accumulator). */
export type Stats = { from: Map<string, number>; to: Map<string, number>; total: number; spam: number };

/** Per-message summary result keyed by messageId (for a summary view). */
export type SummaryResult = { readonly summaries: ReadonlyArray<{ messageId: string; summary: Summary }> };

export const emptyStats = (): Stats => ({ from: new Map(), to: new Map(), total: 0, spam: 0 });

/**
 * Shared context threaded through the email stages via Effect's Requirements channel. `db` is the
 * ECHO space database (browser-safe); `stats` and `summaries` are mutable accumulators read after
 * the run. Callers provide it once at the pipeline edge (`Effect.provide`).
 */
export class EmailPipelineCtx extends Context.Tag('@dxos/pipeline-email/EmailPipelineCtx')<
  EmailPipelineCtx,
  {
    readonly db: Database.Database;
    readonly stats: Stats;
    readonly summaries: Array<{ messageId: string; summary: Summary }>;
  }
>() {}
