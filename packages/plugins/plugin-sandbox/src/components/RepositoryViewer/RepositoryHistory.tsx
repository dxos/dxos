//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Next, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import type { CommitInfo } from '../../services/RepositoryClient.ts';

export type RepositoryHistoryProps = {
  commits: readonly CommitInfo[];
  /** The commit being browsed, when the reader picked one rather than a branch. */
  currentCommit?: string;
  hasMore?: boolean;
  onSelect: (hash: string) => void;
  onLoadMore?: () => void;
};

/** Commits newest first; picking one browses the files as they were at it. */
export const RepositoryHistory = ({
  commits,
  currentCommit,
  hasMore,
  onSelect,
  onLoadMore,
}: RepositoryHistoryProps) => {
  const { t } = useTranslation(meta.profile.key);
  if (commits.length === 0) {
    return <div className='p-4 text-description'>{t('history-empty.message')}</div>;
  }

  return (
    <Next.ScrollArea.Root orientation='vertical'>
      <Next.ScrollArea.Viewport>
        <ul className='divide-y divide-separator' aria-label={t('history.label')}>
          {commits.map((commit) => {
            const [subject] = commit.message.trim().split('\n');
            return (
              <li key={commit.hash}>
                <button
                  type='button'
                  className={mx(
                    'w-full grid grid-cols-[1fr_min-content] gap-x-4 px-3 py-2 text-start hover:bg-hover-surface',
                    commit.hash === currentCommit && 'bg-current-surface',
                  )}
                  onClick={() => onSelect(commit.hash)}
                  data-testid='repository.history.commit'
                >
                  <span className='truncate'>{subject}</span>
                  <code className='text-xs text-description'>{commit.hash.slice(0, 7)}</code>
                  <span className='text-xs text-description truncate'>
                    {commit.author.name} · {new Date(commit.author.timestamp).toLocaleString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {hasMore && onLoadMore && (
          <div className='p-2 grid'>
            <Next.Button variant='ghost' onClick={onLoadMore}>
              {t('history-more.button')}
            </Next.Button>
          </div>
        )}
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  );
};
