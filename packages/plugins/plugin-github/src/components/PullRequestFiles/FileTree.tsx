//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { Tree, type TreeNode, type TreeSelectEvent, createStaticTreeModel } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

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
  const { t } = Hooks.useTranslation(meta.profile.key);
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
    ({ item }: TreeSelectEvent<FileNode>) => {
      if (item.file) {
        onSelect(item.path);
      }
    },
    [onSelect],
  );

  const renderRow = useCallback(
    (node: TreeNode<FileNode>) => {
      const item = node.item;
      return (
        <Tree.Item node={node}>
          <Tree.ItemIndicator />
          <Tree.ItemIcon icon={item?.file ? undefined : 'ph--folder--regular'}>
            {item?.file && (
              <Input.Checkbox
                checked={reviewed.has(item.path)}
                onCheckedChange={({ checked }) => onReviewedChange(item.path, checked === true)}
                // Checking a file off is not a request to open it.
                onClick={(event) => event.stopPropagation()}
                aria-label={t('file-reviewed.label')}
                data-testid='pull-request.files.reviewed'
              />
            )}
          </Tree.ItemIcon>
          <Tree.ItemText />
          {item && <DiffStat added={item.added} removed={item.removed} />}
        </Tree.Item>
      );
    },
    [reviewed, onReviewedChange, t],
  );

  return (
    <Tree.Root id={root.id} model={model} size='sm' onOpenChange={handleOpenChange} onSelect={handleSelect}>
      <Tree.Label srOnly>{t('files-tree.label')}</Tree.Label>
      <Tree.Content>{renderRow}</Tree.Content>
    </Tree.Root>
  );
};
