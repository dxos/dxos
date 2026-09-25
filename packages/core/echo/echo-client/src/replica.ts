//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { log } from '@dxos/log';

import type * as Doc from './automerge/Doc.ts';
import { getAccessorCore } from './core-db/index.ts';
import { RepoClosedError } from './errors.ts';
import { MirrorDocHandle } from './mirror/index.ts';

/**
 * A real Automerge replica of the document behind an accessor, held for code that needs the Automerge
 * API (op-id cursors, `diff`, `changeAt`) in a tab that mirrors the document.
 */
export type AccessorReplica = {
  /** An accessor for the same value over the replica once it has loaded; undefined if it could not open. */
  readonly ready: Promise<Doc.Accessor | undefined>;
  /**
   * Whether the replica and the mirror show the same document: the replica has everything the mirror
   * confirmed, and the mirror has none of this tab's edits in flight for the replica to receive later.
   */
  inStep(): boolean;
  release(): void;
};

/** Holds a replica of the document a mirrored accessor reads until released; undefined for any other accessor. */
export const leaseReplica = (accessor: Doc.Accessor): AccessorReplica | undefined => {
  const mirror = mirrorOf(accessor);
  const lease = mirror?.leaseReplica();
  if (!mirror || !lease) {
    return undefined;
  }

  return {
    ready: lease.ready.then(
      (handle) => overReplica(accessor, handle),
      (error) => {
        // A client closing while the replica opens is routine; anything else leaves the document without cursors.
        if (!RepoClosedError.is(error)) {
          log.warn('replica did not open', { error });
        }
        return undefined;
      },
    ),
    inStep: () => {
      const replica = mirror.replica;
      return replica !== undefined && !mirror.hasPending && A.hasHeads(replica.doc(), mirror.heads);
    },
    release: () => lease.release(),
  };
};

/** The replica a lease holds for the document a mirrored accessor reads, as an accessor, once it has loaded. */
export const heldReplica = (accessor: Doc.Accessor): Doc.Accessor | undefined => {
  const replica = mirrorOf(accessor)?.replica;
  return replica ? overReplica(accessor, replica) : undefined;
};

const mirrorOf = (accessor: Doc.Accessor): MirrorDocHandle<unknown> | undefined => {
  const handle = getAccessorCore(accessor)?.docHandle;
  return handle instanceof MirrorDocHandle ? handle : undefined;
};

const overReplica = (accessor: Doc.Accessor, handle: Doc.Handle): Doc.Accessor => ({
  handle,
  get path() {
    return accessor.path;
  },
});
