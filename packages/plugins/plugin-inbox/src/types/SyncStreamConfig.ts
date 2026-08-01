//
// Copyright 2026 DXOS.org
//

/**
 * Tuning for a source sync's streaming pipeline. Each sync operation (Gmail, JMAP, Calendar, …)
 * declares its own constant of this shape — the shared type just keeps the vocabulary consistent;
 * values diverge per provider. Provider-specific knobs are optional: a provider omits what it doesn't
 * use (e.g. Calendar's list returns full events, so no full-item fetch to bound, and it isn't
 * capped/re-run, so no per-run budget).
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
   * Width of each date window the *forward* walk queries on a date-granular provider (Gmail): it emits
   * oldest-first so the cursor advances gap-free under a cap, and this bounds the in-memory reversal.
   * The backward walk needs no chunking. Omit for position/token paging (JMAP).
   */
  readonly dateChunkDays?: number;
};
