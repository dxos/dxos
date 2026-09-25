//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Ref } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

export type PullRequestDiff = {
  diff?: string;
  /** Head commit the diff was read at, which a line comment on it must name. */
  commit?: string;
  error?: Error;
};

/** Reads a pull request's diff through the space's GitHub connection, once `enabled` first turns true. */
export const usePullRequestDiff = (
  pullRequest: Ref.Ref<PullRequest.PullRequest>,
  spaceId: SpaceId | undefined,
  enabled: boolean,
): PullRequestDiff => {
  const { invokePromise } = useOperationInvoker();
  const [result, setResult] = useState<PullRequestDiff>({});
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (enabled) {
      setRequested(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!requested) {
      return;
    }
    let cancelled = false;
    void invokePromise(GitHubOperation.GetPullRequestDiff, { pullRequest }, { spaceId }).then(({ data, error }) => {
      if (cancelled) {
        return;
      }
      if (error) {
        log.warn('pull request diff failed', { error });
      }
      setResult({ diff: data?.diff, commit: data?.commit, error });
    });
    return () => {
      cancelled = true;
    };
  }, [requested, invokePromise, pullRequest, spaceId]);

  return result;
};
