//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { type RepositoryView, RepositoryViewer } from '#components';
import { type Repository, RepositoryOperation } from '#types';

import type { BranchInfo, CommitInfo, RepositoryFile, TreeEntry } from '../../services/RepositoryClient.ts';

export type RepositoryArticleProps = AppSurface.ObjectArticleProps<Repository.Repository>;

const PAGE_SIZE = 30;

/**
 * Browses a repository: branch picker, lazily listed file tree, file contents and commit history.
 * Every read is an operation, so what the viewer shows is exactly what an agent's tools see.
 */
export const RepositoryArticle = ({ role, subject: repository }: RepositoryArticleProps) => {
  const invoker = useOperationInvoker();
  const spaceId = Obj.getDatabase(repository)?.spaceId;

  const [branches, setBranches] = useState<readonly BranchInfo[]>([]);
  const [currentRef, setCurrentRef] = useState<string>();
  const [view, setView] = useState<RepositoryView>('files');
  const [directories, setDirectories] = useState<ReadonlyMap<string, readonly TreeEntry[]>>(() => new Map());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [selectedPath, setSelectedPath] = useState<string>();
  const [file, setFile] = useState<RepositoryFile>();
  const [commits, setCommits] = useState<readonly CommitInfo[]>([]);
  const [hasMoreCommits, setHasMoreCommits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Bumped whenever the ref changes, so a response for the previous ref is dropped when it lands.
  const generation = useRef(0);

  const invoke = useCallback(
    async <I, O>(operation: Operation.Definition<I, O>, input: I): Promise<O | undefined> => {
      if (!spaceId) {
        return undefined;
      }
      const { data, error } = await invoker.invokePromise(operation, input, { spaceId });
      if (error) {
        log.catch(error);
        setError(error.message);
        return undefined;
      }
      return data;
    },
    [invoker, spaceId],
  );

  const repositoryRef = useMemo(() => Ref.make(repository), [repository]);

  // Branches, on open and on refresh; the first load settles on the default branch.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void invoke(RepositoryOperation.GetBranches, { repository: repositoryRef }).then((result) => {
      if (cancelled || !result) {
        return;
      }
      setBranches(result.branches);
      setCurrentRef((current) => current ?? (result.branches.length > 0 ? result.defaultBranch : undefined));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [invoke, repositoryRef, refreshKey]);

  // A new ref starts from its root listing.
  useEffect(() => {
    if (!currentRef) {
      return;
    }
    const current = ++generation.current;
    setDirectories(new Map());
    setFile(undefined);
    void invoke(RepositoryOperation.GetTree, { repository: repositoryRef, ref: currentRef, path: '' }).then(
      (result) => {
        if (result && current === generation.current) {
          setDirectories(new Map([['', result.entries]]));
        }
      },
    );
  }, [invoke, repositoryRef, currentRef, refreshKey]);

  // Expanded directories not listed yet are listed.
  useEffect(() => {
    if (!currentRef || !directories.has('')) {
      return;
    }
    const current = generation.current;
    for (const path of expanded) {
      if (directories.has(path)) {
        continue;
      }
      void invoke(RepositoryOperation.GetTree, { repository: repositoryRef, ref: currentRef, path }).then((result) => {
        if (result && current === generation.current) {
          setDirectories((previous) => new Map(previous).set(path, result.entries));
        }
      });
    }
  }, [invoke, repositoryRef, currentRef, expanded, directories]);

  // The selected file, at the current ref; a path the ref does not have simply shows nothing.
  useEffect(() => {
    if (!currentRef || !selectedPath) {
      return;
    }
    const current = generation.current;
    void invoke(RepositoryOperation.ReadFile, { repository: repositoryRef, ref: currentRef, path: selectedPath }).then(
      (result) => {
        if (current === generation.current) {
          setFile(result);
        }
      },
    );
  }, [invoke, repositoryRef, currentRef, selectedPath, refreshKey]);

  const loadCommits = useCallback(
    async (offset: number) => {
      if (!currentRef) {
        return;
      }
      const current = generation.current;
      const result = await invoke(RepositoryOperation.GetLog, {
        repository: repositoryRef,
        ref: currentRef,
        limit: PAGE_SIZE,
        offset,
      });
      if (result && current === generation.current) {
        setCommits((previous) => (offset === 0 ? result.commits : [...previous, ...result.commits]));
        setHasMoreCommits(result.commits.length === PAGE_SIZE);
      }
    },
    [invoke, repositoryRef, currentRef],
  );

  useEffect(() => {
    if (view === 'history') {
      void loadCommits(0);
    }
  }, [view, loadCommits, refreshKey]);

  const handleExpandedChange = useCallback((path: string, open: boolean) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (open) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
  }, []);

  const handleSelectCommit = useCallback((hash: string) => {
    setCurrentRef(hash);
    setView('files');
  }, []);

  const handleRefresh = useCallback(() => {
    setError(undefined);
    setRefreshKey((key) => key + 1);
  }, []);

  return (
    <RepositoryViewer
      role={role}
      branches={branches}
      currentRef={currentRef}
      view={view}
      directories={directories}
      expanded={expanded}
      selectedPath={selectedPath}
      file={file}
      commits={commits}
      hasMoreCommits={hasMoreCommits}
      loading={loading}
      error={error}
      onRefChange={setCurrentRef}
      onViewChange={setView}
      onRefresh={handleRefresh}
      onExpandedChange={handleExpandedChange}
      onSelectPath={setSelectedPath}
      onSelectCommit={handleSelectCommit}
      onLoadMoreCommits={() => void loadCommits(commits.length)}
    />
  );
};
