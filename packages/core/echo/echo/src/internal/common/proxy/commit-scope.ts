//
// Copyright 2026 DXOS.org
//

/**
 * Commit scope: groups the synchronous document writes of one user-level mutation (an `Obj.update`, a
 * `db.add`, a single property write) into one commit, and runs post-commit callbacks once the outermost
 * commit has ended.
 *
 * Post-commit callbacks run after every document semaphore is released and every change event has been
 * delivered, but before the writing call returns. That is the one point where a subscriber may observe
 * the committed state and write again without re-entering a document change.
 */

let depth = 0;
let draining = false;
const pending = new Set<() => void>();

/**
 * Opens a commit. Returns the function that closes it; closing the outermost commit drains the
 * post-commit queue.
 */
export const beginCommit = (): (() => void) => {
  depth++;
  let ended = false;
  return () => {
    if (ended) {
      return;
    }
    ended = true;
    depth--;
    if (depth === 0) {
      drainCommitQueue();
    }
  };
};

/** Runs `body` as one commit. */
export const runInCommit = <T>(body: () => T): T => {
  const endCommit = beginCommit();
  try {
    return body();
  } finally {
    endCommit();
  }
};

/**
 * Requests `callback` after the current outermost commit. Outside any commit it runs at once. A callback
 * requested several times before the drain runs once, so it must read its own pending state.
 */
export const afterCommit = (callback: () => void): void => {
  pending.add(callback);
  if (depth === 0) {
    drainCommitQueue();
  }
};

const drainCommitQueue = (): void => {
  // A write made by a callback ends its own commit inside this loop; its callbacks join the queue and run
  // in a later round, after every callback of the current round has seen the earlier commit.
  if (draining) {
    return;
  }
  draining = true;
  try {
    while (pending.size > 0) {
      const round = [...pending];
      pending.clear();
      for (const callback of round) {
        try {
          callback();
        } catch (error) {
          // The write has committed; a failing subscriber must not make the writer's call throw, and must
          // not stop the callbacks after it. Rethrown outside the commit so it still surfaces as unhandled.
          queueMicrotask(() => {
            throw error;
          });
        }
      }
    }
  } finally {
    draining = false;
  }
};
