//
// Copyright 2026 DXOS.org
//

import { type CodeViewItem, parsePatchFiles } from '@pierre/diffs';
import { CodeView } from '@pierre/diffs/react';
import React, { useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Ref } from '@dxos/echo';
import { Task } from '@dxos/types';
import { Panel, useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { GitHubOperation } from '#types';

export type PullRequestChangesCompanionProps = {
  role?: string;
  subject: Task.Task;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; diff: string };

/**
 * Companion panel that fetches and renders the diff of the pull request backing a Task.
 *
 * The diff is fetched on demand via {@link GitHubOperation.GetGitHubPullRequestDiff} and held in
 * component state only (not persisted to ECHO), then rendered with `@pierre/diffs`.
 */
export const PullRequestChangesCompanion = ({ role, subject }: PullRequestChangesCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    invokePromise(GitHubOperation.GetGitHubPullRequestDiff, { task: Ref.make(subject) })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.error) {
          setState({ status: 'error', message: result.error.message });
        } else {
          setState({ status: 'loaded', diff: result.data?.diff ?? '' });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [subject, invokePromise]);

  const items = useMemo<CodeViewItem[]>(() => {
    if (state.status !== 'loaded') {
      return [];
    }
    return parsePatchFiles(state.diff).flatMap((patch, patchIndex) =>
      patch.files.map((file, fileIndex) => ({
        id: `diff:${patchIndex}:${fileIndex}:${file.name}`,
        type: 'diff' as const,
        fileDiff: file,
      })),
    );
  }, [state]);

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='flex flex-col min-bs-0'>
        {state.status === 'loading' ? (
          <Empty label={t('pull-request-changes.loading.message')} />
        ) : state.status === 'error' ? (
          <Empty icon='ph--warning--regular' label={t('pull-request-changes.error.message')} />
        ) : items.length === 0 ? (
          <Empty label={t('pull-request-changes.empty.message')} />
        ) : (
          <CodeView
            items={items}
            style={{ height: '100%', overflow: 'auto' }}
            options={{
              theme: { dark: 'pierre-dark', light: 'pierre-light' },
              stickyHeaders: true,
              layout: { paddingTop: 16, paddingBottom: 16, gap: 12 },
            }}
          />
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

PullRequestChangesCompanion.displayName = 'PullRequestChangesCompanion';
