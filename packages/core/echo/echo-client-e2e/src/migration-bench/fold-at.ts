//
// Copyright 2026 DXOS.org
//

import { next as A, type Doc as AutomergeDoc, type ChangeOptions, type Heads } from '@automerge/automerge';

import { getObjectCore } from '@dxos/echo-client/testing';
import { type AnyProperties } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { getDeep } from '@dxos/util';

//
// M0 migration research follow-up (design item 6 / open item "a first-class fold-at-heads primitive"):
// turns the four-step dance in `conflicts.test.ts`'s H4b into a reusable primitive. See
// `/tmp/claude-0/-home-user-dxos/5ba0d596-75ce-5e5a-a26a-ca5267abef04/scratchpad/findings-item5.md`
// for the soundness verdict this file's tests establish.
//

/** Lexicographically the lowest possible 16-byte actor id, so it loses every Automerge counter tie. */
export const SENTINEL_ACTOR = '00'.repeat(16);

export type FoldPolicy = 'user-wins' | 'fold-wins';

export type FoldAtOptions = {
  /**
   * `'user-wins'` (default): forks a view at `heads` under {@link SENTINEL_ACTOR} and merges it back,
   * so the fold's op ties on Lamport counter with any concurrent direct edit and loses the actor
   * tie-break. `'fold-wins'`: writes directly on the live handle via plain `changeAt`, so the fold's
   * op counter is derived from the CURRENT frontier and dominates any edit that raced it.
   */
  policy?: FoldPolicy;

  /** Attribution surfaced by `getEditHistoryWithDiffs().message` — identify the lens/fold that wrote this. */
  message?: string;

  /**
   * Change timestamp (Automerge seconds, matching `ChangeOptions['time']`). Defaults to `0`, NOT
   * `Date.now()`: a fold-forward runner recomputes the same fold from the same source data on every
   * peer and on every re-run, and the ONLY way two independently-authored `user-wins` changes at the
   * same heads are safe under a shared {@link SENTINEL_ACTOR} is for them to be byte-identical (same
   * hash) -- see the soundness findings. A wall-clock default would make every independent
   * computation of "the same fold" a distinct change and defeat that guarantee, so callers must
   * opt in explicitly to a non-deterministic time.
   */
  time?: number;
};

/**
 * The `objects.<id>.data` sub-object a change callback mutates -- the same shape `setDeep`/`getDeep`
 * navigate to elsewhere in `ObjectCore`, exposed here as a plain draft so callers write fields
 * directly (`draft.name = 'late'`) instead of building a key path.
 */
export type FoldDraft = Record<string, unknown>;

const getEntityDataDraft = (doc: unknown, mountPath: readonly (string | number)[]): FoldDraft => {
  const draft = getDeep<FoldDraft>(doc, [...mountPath, 'data']);
  invariant(draft, 'foldAt: object body not present at the recorded heads');
  return draft;
};

/**
 * Writes `mutate` at the causal point `heads` instead of the object's current frontier -- re-keying a
 * late (fold-forward) value into the concurrent past so it lands as a real Automerge conflict against
 * any direct edit made since, rather than silently overwriting it. This is the primitive behind
 * DESIGN.md item 6 ("conflicts are history-native"): no app-level conflict record, the CRDT itself
 * carries it, and the winner is a deterministic policy (see {@link FoldAtOptions.policy}).
 *
 * Idempotent under re-run PROVIDED `mutate`'s effect, `options.message`, and `options.time` are a
 * pure function of `heads` and the source data being folded: re-running then produces a byte-identical
 * change, which Automerge dedups by hash on re-merge (a genuine no-op), not a second, divergent
 * change under the same sentinel actor. Re-running with a different value at the SAME heads (a value
 * that itself changed between runs) is not a "re-run" in this sense and is exactly the fold-forward
 * case `user-wins` is for: the new value legitimately conflicts with what is there.
 *
 * @returns The heads immediately after the fold's own change.
 */
export const foldAt = <T extends AnyProperties>(
  obj: T,
  heads: Heads,
  mutate: (draft: FoldDraft) => void,
  options: FoldAtOptions = {},
): Heads => {
  const { policy = 'user-wins', message, time = 0 } = options;
  const changeOptions: ChangeOptions<unknown> = { message, time };
  const core = getObjectCore(obj);
  const mountPath = core.mountPath;

  if (policy === 'fold-wins') {
    // Plain live-handle changeAt: the new op's counter derives from the CURRENT frontier, so it
    // dominates a concurrent direct edit made since `heads` regardless of actor.
    const newHeads = core.changeAt(
      heads,
      (doc: AutomergeDoc<unknown>) => mutate(getEntityDataDraft(doc, mountPath)),
      changeOptions,
    );
    invariant(newHeads, 'foldAt: fold-wins changeAt produced no new heads');
    return newHeads;
  }

  invariant(core.docHandle, 'foldAt: user-wins policy requires a bound docHandle (no bare-doc path)');

  // Fork a view AT the recorded heads (not the live doc) under the sentinel actor: the new op's
  // counter is derived from that OLDER state and ties with a direct edit's, letting actor comparison
  // decide the tie (H4b's verified finding -- cloning the live doc instead lets counter dominance
  // decide it before actor comparison is ever reached, and the fold always wins).
  const view = A.view(core.getDoc(), heads);
  const clone = A.clone(view, { actor: SENTINEL_ACTOR });
  const { newDoc: folded, newHeads } = A.changeAt(clone, heads, changeOptions, (doc) =>
    mutate(getEntityDataDraft(doc, mountPath)),
  );
  invariant(newHeads, 'foldAt: user-wins changeAt produced no new heads');

  core.docHandle.update((doc) => A.merge(doc, folded));
  return newHeads;
};
