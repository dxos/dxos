//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';

import { type Database } from '@dxos/echo';

/** Summary produced by the summarize stage. */
export type Summary = { readonly summary: string; readonly isSpam: boolean; readonly keywords: readonly string[] };

/** Running tallies produced by the stats stage (mutable accumulator). */
export type Stats = { from: Map<string, number>; to: Map<string, number>; total: number; spam: number };

/** Per-message summary result keyed by messageId, for the SummaryView. */
export type SummaryResult = { readonly summaries: ReadonlyArray<{ messageId: string; summary: Summary }> };

/**
 * Shared context threaded through the stages via Effect's Requirements channel. `db` is the ECHO
 * space database (browser-safe); `stats` is the mutable accumulator read after the run.
 */
export class EmailPipelineCtx extends Context.Tag('@dxos/stories-brain/EmailPipelineCtx')<
  EmailPipelineCtx,
  {
    readonly db: Database.Database;
    readonly stats: Stats;
    readonly summaries: Array<{ messageId: string; summary: Summary }>;
  }
>() {}

export const emptyStats = (): Stats => ({ from: new Map(), to: new Map(), total: 0, spam: 0 });
