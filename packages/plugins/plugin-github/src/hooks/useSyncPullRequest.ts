//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/Hooks';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

/** How long a re-sync stands before the pull request is read from GitHub again. */
const SYNC_INTERVAL = 5 * 60_000;

// Keyed by object id: a board of pull request cards would otherwise spend one GitHub request per
// card each time it mounts, and an anonymous caller has only 60 an hour. Entries past the interval
// are pruned on every write, so the map holds only pull requests synced within it.
const lastSynced = new Map<string, number>();

const markSynced = (id: string, now: number) => {
  for (const [key, syncedAt] of lastSynced) {
    if (now - syncedAt >= SYNC_INTERVAL) {
      lastSynced.delete(key);
    }
  }
  lastSynced.set(id, now);
};

/**
 * Refreshes a stored pull request from GitHub when it is shown, since whatever shows it is the moment
 * its fields are worth trusting: a repository sync may be days old, and an import is never re-synced.
 *
 * A pull request held by no database (a link preview) is skipped, as there is nothing to write back to,
 * and one synced within {@link SYNC_INTERVAL} is skipped too.
 */
export const useSyncPullRequest = (pullRequest: PullRequest.PullRequest): void => {
  const { invokePromise } = useOperationInvoker();
  const spaceId = Obj.getDatabase(pullRequest)?.spaceId;
  useEffect(() => {
    const now = Date.now();
    if (!spaceId || now - (lastSynced.get(pullRequest.id) ?? 0) < SYNC_INTERVAL) {
      return;
    }
    markSynced(pullRequest.id, now);
    void invokePromise(GitHubOperation.SyncPullRequest, { pullRequest: Ref.make(pullRequest) }, { spaceId }).then(
      ({ error }) => error && log.warn('pull request sync failed', { error }),
    );
  }, [invokePromise, pullRequest, spaceId]);
};
