//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Field, Icon, useTranslation } from '@dxos/react-ui';
import { type ColumnRenderer, type IconRenderer, Tree, createStaticTreeModel } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { DiffStat } from './DiffStat.tsx';
import { type FileNode } from './files.ts';

export type FileTreeProps = {
  root: FileNode;
  /** Path of the file on screen. */
  selected?: string;
  /** Paths of the files the reader has checked off. */
  reviewed: ReadonlySet<string>;
  onSelect: (path: string) => void;
  onReviewedChange: (path: string, reviewed: boolean) => void;
};

/**
 * The changed files as a tree: a checkbox per file to mark it reviewed, its change counts at the
 * trailing edge, and the file on screen as the current row.
 */
export const FileTree = ({ root, selected, reviewed, onSelect, onReviewedChange }: FileTreeProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The model is rebuilt whenever the selection moves, so the reader's collapses live outside it.
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());

  const model = useMemo(
    () =>
      createStaticTreeModel<FileNode>(root, {
        getChildren: (node) => node.children,
        // `count` off: the counts that matter here are the change counts in the trailing column.
        getProps: (node) => ({ label: node.name, count: undefined, testId: 'pull-request.files.row' }),
        isOpen: (node) => !closed.has(node.id),
        isCurrent: (node) => node.file !== undefined && node.path === selected,
      }),
    [root, selected, closed],
  );

  const handleOpenChange = useCallback(
    ({ item, open }: { item: FileNode; open: boolean }) =>
      setClosed((previous) => {
        const next = new Set(previous);
        if (open) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      }),
    [],
  );

  const handleSelect = useCallback(
    ({ item }: { item: FileNode }) => {
      if (item.file) {
        onSelect(item.path);
      }
    },
    [onSelect],
  );

  const renderIcon = useMemo<IconRenderer<FileNode>>(
    () =>
      ({ item }) =>
        item.file ? (
          <Field.Checkbox
            size={4}
            checked={reviewed.has(item.path)}
            onCheckedChange={(checked) => onReviewedChange(item.path, checked === true)}
            // Checking a file off is not a request to open it.
            onClick={(event) => event.stopPropagation()}
            aria-label={t('file-reviewed.label')}
            data-testid='pull-request.files.reviewed'
          />
        ) : (
          <Icon icon='ph--folder--regular' size={4} />
        ),
    [reviewed, onReviewedChange, t],
  );

  const renderColumns = useMemo<ColumnRenderer<FileNode>>(
    () =>
      ({ item }) => <DiffStat added={item.added} removed={item.removed} />,
    [],
  );

  return (
    <Tree<FileNode>
      id={root.id}
      model={model}
      ariaLabel={t('files-tree.label')}
      classNames='text-sm'
      density='sm'
      renderIcon={renderIcon}
      renderColumns={renderColumns}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
    />
  );
};
