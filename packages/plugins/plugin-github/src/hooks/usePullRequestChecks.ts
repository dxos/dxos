//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { type PullRequestChecks } from '../containers/PullRequestsArticle/arrange.ts';

/** How long a pull request's checks stand before they are read from GitHub again. */
const CHECKS_INTERVAL = 5 * 60_000;

/** Status reads in flight at once: each costs three GitHub requests, and a list can hold hundreds. */
const CONCURRENCY = 4;

// Keyed by object id and shared across mounts, so reopening the list within the interval costs nothing.
const cache = new Map<string, { at: number; checks: PullRequestChecks }>();

/** Whether a pull request's checks still change; a merged or closed one's head is settled. */
const isLive = (pullRequest: PullRequest.PullRequest) => pullRequest.state === 'open' || pullRequest.state === 'draft';

/**
 * The CI and review standing of every live pull request in `pullRequests`, keyed by object id and
 * filled in as each read lands. Finished pull requests are not read: their checks no longer ask
 * anything of the reader.
 */
export const usePullRequestChecks = (
  pullRequests: readonly PullRequest.PullRequest[],
  spaceId: SpaceId | undefined,
): ReadonlyMap<string, PullRequestChecks> => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [checks, setChecks] = useState<ReadonlyMap<string, PullRequestChecks>>(
    () => new Map([...cache].map(([id, { checks }]) => [id, checks])),
  );

  useEffect(() => {
    if (!spaceId) {
      return;
    }

    let cancelled = false;
    const now = Date.now();
    const queue = pullRequests.filter(
      (pullRequest) => isLive(pullRequest) && now - (cache.get(pullRequest.id)?.at ?? 0) >= CHECKS_INTERVAL,
    );

    const worker = async () => {
      for (let pullRequest = queue.shift(); pullRequest && !cancelled; pullRequest = queue.shift()) {
        const { data, error } = await invokePromise(
          GitHubOperation.GetPullRequestStatus,
          { pullRequest: Ref.make(pullRequest) },
          { spaceId },
        );
        if (error || !data) {
          log.warn('pull request checks failed', { pullRequest: pullRequest.id, error });
          continue;
        }
        const next = { ci: data.ci, checks: data.checks, review: data.review, approvals: data.approvals };
        cache.set(pullRequest.id, { at: Date.now(), checks: next });
        // Set even once cancelled: the next run skips this pull request as freshly cached, so a read
        // that lands across a re-run would otherwise never reach the list.
        const id = pullRequest.id;
        setChecks((previous) => new Map(previous).set(id, next));
      }
    };

    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    return () => {
      cancelled = true;
    };
  }, [invokePromise, pullRequests, spaceId]);

  return checks;
};
