//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type FileEntry = {
  path: string;
};

type Node = {
  name: string;
  path: string;
  children?: Map<string, Node>;
};

const buildTree = (files: readonly FileEntry[]): Node => {
  const root: Node = { name: '', path: '', children: new Map() };
  for (const file of files) {
    const parts = file.path.split('/').filter((part) => part.length > 0);
    let cursor = root;
    let acc = '';
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      acc = acc ? `${acc}/${part}` : part;
      const isLeaf = index === parts.length - 1;
      if (!cursor.children) {
        cursor.children = new Map();
      }
      let next = cursor.children.get(part);
      if (!next) {
        next = isLeaf ? { name: part, path: acc } : { name: part, path: acc, children: new Map() };
        cursor.children.set(part, next);
      }
      cursor = next;
    }
  }
  return root;
};

const sortNodes = (nodes: Iterable<Node>): Node[] => {
  const list = Array.from(nodes);
  list.sort((a, b) => {
    const aIsDir = !!a.children;
    const bIsDir = !!b.children;
    if (aIsDir !== bIsDir) {
      return aIsDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  return list;
};

export type FileTreeProps = ThemedClassName<{
  files: readonly FileEntry[];
  selectedPath?: string;
  onSelect?: (path: string) => void;
  emptyMessage?: string;
}>;

export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMessage }: FileTreeProps) => {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return <div className={mx('p-2 text-description text-sm', classNames)}>{emptyMessage ?? 'No files yet.'}</div>;
  }

  return (
    <ul role='tree' className={mx('flex flex-col py-1 text-sm', classNames)}>
      {sortNodes(tree.children?.values() ?? []).map((node) => (
        <FileTreeNode key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </ul>
  );
};

type NodeProps = {
  node: Node;
  depth: number;
  selectedPath?: string;
  onSelect?: (path: string) => void;
};

const FileTreeNode = ({ node, depth, selectedPath, onSelect }: NodeProps) => {
  const isFolder = !!node.children;
  const [expanded, setExpanded] = useState(true);
  const isSelected = !isFolder && selectedPath === node.path;
  const indent = { paddingInlineStart: `${depth * 0.75 + 0.5}rem` };

  if (isFolder) {
    return (
      <li role='treeitem' aria-expanded={expanded}>
        <button
          type='button'
          className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hoverSurface'
          style={indent}
          onClick={() => setExpanded((current) => !current)}
        >
          <Icon icon={expanded ? 'ph--caret-down--regular' : 'ph--caret-right--regular'} size={3} />
          <Icon icon={expanded ? 'ph--folder-open--regular' : 'ph--folder--regular'} size={4} />
          <span className='truncate'>{node.name}</span>
        </button>
        {expanded && (
          <ul role='group' className='flex flex-col'>
            {sortNodes(node.children!.values()).map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li role='treeitem' aria-selected={isSelected}>
      <button
        type='button'
        className={mx(
          'flex items-center gap-1 w-full text-start py-0.5 hover:bg-hoverSurface',
          isSelected && 'bg-activeSurface text-accentText',
        )}
        style={indent}
        onClick={() => onSelect?.(node.path)}
      >
        <span className='inline-block w-3' aria-hidden />
        <Icon icon='ph--file-code--regular' size={4} />
        <span className='truncate'>{node.name}</span>
      </button>
    </li>
  );
};
