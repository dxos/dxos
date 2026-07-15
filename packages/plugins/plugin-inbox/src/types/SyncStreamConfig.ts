//
// Copyright 2026 DXOS.org
//

/**
 * Tuning for a source sync's streaming pipeline. Each sync operation (Gmail, JMAP, Calendar, …)
 * declares its OWN constant of this shape — the shared type just keeps the vocabulary consistent
 * across providers; the values are expected to diverge and be tweaked independently even where they
 * currently match. Provider-specific knobs are optional: a provider omits what it doesn't use (e.g.
 * Calendar's list returns full events, so it has no separate full-item fetch to bound, and it is not
 * capped/re-run, so it has no per-run item budget).
 */
export type SyncStreamConfig = {
  /** Items requested per provider list/query API page — the id/event enumeration page size. */
  readonly listPageSize: number;
  /** Items per feed-commit batch — kept small so each `Feed.append` is a single atomic queue insert. */
  readonly commitPageSize: number;
  /** In-flight full-item fetches, for a provider whose list returns ids rather than full items. */
  readonly fetchConcurrency?: number;
  /** Candidate items a single run processes before committing and requesting `Operation.runAgain()`. */
  readonly maxItemsPerRun?: number;
  /**
   * Width of each date window the *forward* (incremental) walk queries on a date-granular provider
   * (Gmail): it must emit oldest-first for the cursor to advance gap-free under a per-run cap, and
   * this bounds the in-memory reversal that achieves that. The backward walk needs no chunking (the
   * provider's native newest-first order already matches it). Omit for position/token paging (JMAP).
   */
  readonly dateChunkDays?: number;
};
