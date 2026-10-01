//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Grid, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { type DiffLineTarget } from '@dxos/ui-editor';

import { meta } from '#meta';

import { type PatchFile } from '../../walkthrough/patch.ts';
import { WalkthroughView } from '../WalkthroughView/index.ts';
import { type FileNode, diffFence } from './files.ts';
import { FileTree } from './FileTree.tsx';

export type PullRequestFilesProps = {
  /** Undefined while the diff is loading. */
  tree?: FileNode;
  /** The file on screen. */
  file?: PatchFile;
  reviewed: ReadonlySet<string>;
  total: number;
  /** Shown in place of the files when the diff could not be read. */
  error?: string;
  onSelect: (path: string) => void;
  onReviewedChange: (path: string, reviewed: boolean) => void;
  onLineComment?: (target: DiffLineTarget, anchor: HTMLElement) => void;
};

/**
 * Every changed file, one at a time: the file's diff rendered as a walkthrough chunk, beside a rail
 * listing the changed files as a tree the reader checks off as they go.
 */
export const PullRequestFiles = ({
  tree,
  file,
  reviewed,
  total,
  error,
  onSelect,
  onReviewedChange,
  onLineComment,
}: PullRequestFilesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const fence = useMemo(() => (file && file.hunks.length > 0 ? diffFence(file) : undefined), [file]);

  if (error) {
    return (
      <Next.Empty icon='ph--warning--regular' classNames='dx-expand'>
        {error}
      </Next.Empty>
    );
  }
  if (!tree) {
    return <Next.Empty classNames='dx-expand'>{t('files-loading.message')}</Next.Empty>;
  }

  return (
    <Grid cols={['minmax(0, 1fr)', '18rem']} data-testid='pull-request.files'>
      {fence ? (
        // Keyed by file so the next file opens at its top rather than at the previous one's scroll.
        <WalkthroughView key={file?.path} value={fence} onLineComment={onLineComment} />
      ) : (
        <Next.Empty classNames='dx-expand'>{t(file ? 'file-no-diff.message' : 'no-files.message')}</Next.Empty>
      )}
      <Next.ScrollArea.Root classNames='border-s border-subdued-separator'>
        <Next.ScrollArea.Viewport classNames='p-2'>
          <Next.Field.Root>
            <Next.Field.Label classNames='px-2'>
              {t('files-reviewed.label', { reviewed: reviewed.size, total })}
            </Next.Field.Label>
          </Next.Field.Root>
          <FileTree
            root={tree}
            selected={file?.path}
            reviewed={reviewed}
            onSelect={onSelect}
            onReviewedChange={onReviewedChange}
          />
        </Next.ScrollArea.Viewport>
      </Next.ScrollArea.Root>
    </Grid>
  );
};
