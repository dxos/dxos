//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Empty from '@dxos/react-ui/Empty';
import * as Field from '@dxos/react-ui/Field';
import * as Grid from '@dxos/react-ui/Grid';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const fence = useMemo(() => (file && file.hunks.length > 0 ? diffFence(file) : undefined), [file]);

  if (error) {
    return (
      <Empty.Empty icon='ph--warning--regular' classNames='dx-expand'>
        {error}
      </Empty.Empty>
    );
  }
  if (!tree) {
    return <Empty.Empty classNames='dx-expand'>{t('files-loading.message')}</Empty.Empty>;
  }

  return (
    <Grid.Grid cols={['minmax(0, 1fr)', '18rem']} data-testid='pull-request.files'>
      {fence ? (
        // Keyed by file so the next file opens at its top rather than at the previous one's scroll.
        <WalkthroughView key={file?.path} value={fence} onLineComment={onLineComment} />
      ) : (
        <Empty.Empty classNames='dx-expand'>{t(file ? 'file-no-diff.message' : 'no-files.message')}</Empty.Empty>
      )}
      <ScrollArea.Root classNames='border-s border-separator-subtle'>
        <ScrollArea.Viewport classNames='p-2'>
          <Field.Root>
            <Field.Label classNames='px-2'>{t('files-reviewed.label', { reviewed: reviewed.size, total })}</Field.Label>
          </Field.Root>
          <FileTree
            root={tree}
            selected={file?.path}
            reviewed={reviewed}
            onSelect={onSelect}
            onReviewedChange={onReviewedChange}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Grid.Grid>
  );
};
