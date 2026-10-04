//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Grid from '@dxos/react-ui/Grid';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';

import type { BranchInfo, CommitInfo, RepositoryFile, TreeEntry } from '../../services/RepositoryClient.ts';
import { RepositoryFileTree } from './RepositoryFileTree.tsx';
import { RepositoryFileView } from './RepositoryFileView.tsx';
import { RepositoryHistory } from './RepositoryHistory.tsx';
import { RepositoryToolbar, type RepositoryView } from './RepositoryToolbar.tsx';

export type RepositoryViewerProps = {
  role?: string;
  branches: readonly BranchInfo[];
  /** Branch name, or the commit hash being browsed. */
  currentRef?: string;
  view: RepositoryView;
  directories: ReadonlyMap<string, readonly TreeEntry[]>;
  expanded: ReadonlySet<string>;
  selectedPath?: string;
  file?: RepositoryFile;
  commits: readonly CommitInfo[];
  hasMoreCommits?: boolean;
  loading?: boolean;
  error?: string;
  onRefChange: (ref: string) => void;
  onViewChange: (view: RepositoryView) => void;
  onRefresh: () => void;
  onExpandedChange: (path: string, expanded: boolean) => void;
  onSelectPath: (path: string) => void;
  onSelectCommit: (hash: string) => void;
  onLoadMoreCommits?: () => void;
};

/**
 * A repository at one branch or commit: its files as a tree beside the selected file, or its
 * history. Fully controlled — the container owns fetching, so this renders the same in a story.
 */
export const RepositoryViewer = ({
  role,
  branches,
  currentRef,
  view,
  directories,
  expanded,
  selectedPath,
  file,
  commits,
  hasMoreCommits,
  loading,
  error,
  onRefChange,
  onViewChange,
  onRefresh,
  onExpandedChange,
  onSelectPath,
  onSelectCommit,
  onLoadMoreCommits,
}: RepositoryViewerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const empty = !loading && !error && branches.length === 0;
  const isCommit = currentRef !== undefined && !branches.some((branch) => branch.name === currentRef);

  return (
    <Panel.Root role={role} classNames='dx-expand'>
      <Panel.Header>
        <RepositoryToolbar
          branches={branches}
          currentRef={currentRef}
          view={view}
          onRefChange={onRefChange}
          onViewChange={onViewChange}
          onRefresh={onRefresh}
        />
      </Panel.Header>
      <Panel.Body asChild>
        {error ? (
          <Message testId='repository.error'>{error}</Message>
        ) : empty ? (
          <Message testId='repository.empty'>{t('repository-empty.message')}</Message>
        ) : view === 'history' ? (
          <RepositoryHistory
            commits={commits}
            currentCommit={isCommit ? currentRef : undefined}
            hasMore={hasMoreCommits}
            onSelect={onSelectCommit}
            onLoadMore={onLoadMoreCommits}
          />
        ) : (
          <Grid.Grid grow cols={['18rem', '1fr']} classNames='divide-x divide-separator'>
            <div
              role='region'
              aria-label={t('files-pane.label')}
              className='dx-expand grid content-start overflow-auto'
            >
              <RepositoryFileTree
                directories={directories}
                expanded={expanded}
                selectedPath={selectedPath}
                onExpandedChange={onExpandedChange}
                onSelect={onSelectPath}
              />
            </div>
            <div
              role='region'
              aria-label={t('file-pane.label')}
              className='dx-expand grid grid-rows-[min-content_1fr] overflow-hidden'
            >
              <div className='px-3 py-1 text-sm text-fg-muted border-b border-separator truncate'>
                {selectedPath ?? t('no-file-selected.message')}
              </div>
              {file ? <RepositoryFileView file={file} /> : <div />}
            </div>
          </Grid.Grid>
        )}
      </Panel.Body>
    </Panel.Root>
  );
};

const Message = ({ children, testId }: { children: string; testId: string }) => (
  <div className='dx-expand grid place-items-center p-4 text-fg-muted text-center' data-testid={testId}>
    {children}
  </div>
);
