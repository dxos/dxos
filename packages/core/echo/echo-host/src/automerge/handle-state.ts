//
// Copyright 2026 DXOS.org
//

import { type DocumentId, type QueryState, type Repo } from '@automerge/automerge-repo';

/**
 * Variants reported by {@link QueryState}: `'loading' | 'ready' | 'unavailable' | 'failed'`.
 */
export type HandleQueryState = QueryState<unknown>['state'];

/**
 * Returns the {@link QueryState} variant for a document already known to the
 * repo (i.e. one for which a handle has been registered via `Repo.find` /
 * `Repo.findWithProgress` / `Repo.create`), or `undefined` if no handle/query
 * exists for this document yet.
 *
 * Use this anywhere you need to ask "is this document loaded?" / "did sync
 * give up?" — read the result against the {@link HandleQueryState} variants
 * (e.g. `=== 'ready'`).
 *
 * # Why we can't just call `DocHandle.isReady()` / read `DocHandle.state`
 *
 * The current subduction fork of `@automerge/automerge-repo`
 * (`2.6.0-subduction.10`) **gutted** the per-handle state machine. Inside the
 * fork, every `DocHandle` state predicate is a constant placeholder:
 *
 * ```
 * isReady       = () => true
 * isUnloaded    = () => false
 * isDeleted     = () => false
 * isUnavailable = () => false
 * inState       = (states) => states.includes('ready')
 * get state     = () => 'ready'
 * whenReady     = async () => {}     // resolves immediately, ignores argument
 * ```
 *
 * That means `handle.isReady()` always lies "yes", `handle.state` always reads
 * `'ready'`, and `await handle.whenReady()` never blocks — even for handles
 * whose document has never been loaded from storage or synced from a peer.
 * Reading `handle.doc()` on such a "ready" handle returns the empty initial
 * doc (`A.init()` or `A.emptyChange(A.init())`) rather than throwing or
 * returning undefined, which can silently corrupt downstream logic that
 * trusted the handle's `isReady()` signal.
 *
 * Real liveness moved to the {@link DocumentQuery} returned by
 * `Repo.findWithProgress`, whose state goes through
 * `'loading' → 'ready' | 'unavailable' | 'failed'`. Production code that
 * needs to know whether a document is actually loaded must consult the query
 * state through this helper instead of any `DocHandle.*` predicate.
 *
 * TODO(mykola): Remove this helper once the fork either (a) restores the
 * `DocHandle` state machine, or (b) every caller is migrated to query
 * `DocumentProgress` directly with a richer API surface (await on state
 * transitions, etc.).
 */
export const getHandleState = (repo: Repo, documentId: DocumentId): HandleQueryState | undefined => {
  if (!repo.handles[documentId]) {
    return undefined;
  }
  return repo.findWithProgress(documentId).peek().state;
};
