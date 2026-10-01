//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { createStaticTreeModel, Tree, type TreeNode, type TreeSelectEvent } from '@dxos/react-ui-list';

import { meta } from '#meta';

import type { TreeEntry } from '../../services/RepositoryClient.ts';

/** A tree row: a directory listing entry, or the synthetic root. */
type FileNode = {
  id: string;
  path: string;
  name: string;
  type: TreeEntry['type'] | 'root';
  /** Undefined until the directory has been listed. */
  children?: FileNode[];
};

export type RepositoryFileTreeProps = {
  /** Listings loaded so far, by directory path; the root is `''`. */
  directories: ReadonlyMap<string, readonly TreeEntry[]>;
  /** Directories the reader has expanded. */
  expanded: ReadonlySet<string>;
  selectedPath?: string;
  onExpandedChange: (path: string, expanded: boolean) => void;
  onSelect: (path: string) => void;
};

/** Path-derived ids, encoded so they never carry the `+` the tree joins paths with. */
const nodeId = (path: string) => `file:${encodeURIComponent(path)}`;

const buildNode = (
  entry: Pick<TreeEntry, 'path' | 'name'> & { type: FileNode['type'] },
  directories: ReadonlyMap<string, readonly TreeEntry[]>,
): FileNode => {
  const listing = entry.type === 'directory' || entry.type === 'root' ? directories.get(entry.path) : undefined;
  return {
    id: nodeId(entry.path),
    path: entry.path,
    name: entry.name,
    type: entry.type,
    children: listing?.map((child) => buildNode(child, directories)),
  };
};

/**
 * A repository's files as a tree whose directories are listed on first expand: a directory not yet
 * listed stays expandable, and the caller fetches its listing when it is opened.
 */
export const RepositoryFileTree = ({
  directories,
  expanded,
  selectedPath,
  onExpandedChange,
  onSelect,
}: RepositoryFileTreeProps) => {
  const { t } = useTranslation(meta.profile.key);
  const root = useMemo(() => buildNode({ path: '', name: '', type: 'root' }, directories), [directories]);

  const model = useMemo(
    () =>
      createStaticTreeModel<FileNode>(root, {
        getChildren: (node) => node.children,
        getProps: (node) => ({
          label: node.name,
          count: undefined,
          testId: 'repository.files.row',
          // An unlisted directory has no children yet; a placeholder keeps its chevron live.
          ...(node.type === 'directory' && !node.children ? { parentOf: [`${node.id}:pending`] } : {}),
        }),
        isOpen: (node) => expanded.has(node.path),
        isCurrent: (node) => node.type !== 'directory' && node.path === selectedPath,
      }),
    [root, expanded, selectedPath],
  );

  const handleOpenChange = useCallback(
    ({ item, open }: { item: FileNode; open: boolean }) => onExpandedChange(item.path, open),
    [onExpandedChange],
  );

  const handleSelect = useCallback(
    ({ item }: TreeSelectEvent<FileNode>) => {
      if (item.type === 'directory') {
        onExpandedChange(item.path, !expanded.has(item.path));
      } else {
        onSelect(item.path);
      }
    },
    [expanded, onExpandedChange, onSelect],
  );

  const renderRow = useCallback(
    (node: TreeNode<FileNode>) => {
      const item = node.item;
      return (
        <Tree.Item node={node}>
          <Tree.ItemIndicator />
          <Tree.ItemIcon
            icon={
              item?.type === 'directory'
                ? expanded.has(item.path)
                  ? 'ph--folder-open--regular'
                  : 'ph--folder--regular'
                : item?.type === 'submodule'
                  ? 'ph--git-fork--regular'
                  : 'ph--file--regular'
            }
          />
          <Tree.ItemText />
        </Tree.Item>
      );
    },
    [expanded],
  );

  return (
    <Tree.Root id={root.id} model={model} size='sm' onOpenChange={handleOpenChange} onSelect={handleSelect}>
      <Tree.Label srOnly>{t('files-tree.label')}</Tree.Label>
      <Tree.Content>{renderRow}</Tree.Content>
    </Tree.Root>
  );
};
