//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { isActionLike, type Node, type NodeArg } from '@dxos/app-graph';
import { log } from '@dxos/log';
import { Path } from '@dxos/react-ui-mosaic';

import { type NavTreeItem } from '../types';

export const flattenTree = (tree: NodeArg<any>, open: string[]): NavTreeItem[] => {
  return Array.from(
    visitor({
      node: tree,
      getItem,
      isOpen: ({ path }) => open.includes(Path.create(...path)),
    }),
  );
};

export function* visitor({
  node,
  getItem,
  isOpen,
}: {
  node: NodeArg<any>;
  getItem: (node: NodeArg<any>, parent?: readonly string[]) => NavTreeItem;
  isOpen?: (node: NavTreeItem) => boolean;
}): Generator<NavTreeItem> {
  const stack: [NodeArg<any>, NavTreeItem][] = [[node, getItem(node)]];
  while (stack.length > 0) {
    const [node, item] = stack.pop()!;
    if (item.path.length > 1) {
      yield item;
    }

    const children = Array.from(node.nodes ?? []);
    if (item.path.length === 1 || isOpen?.(item)) {
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        stack.push([child, getItem(child, item.path)]);
      }
    }
  }
}

// Ensures that the same item is not created multiple times, causing the tree to be re-rendered.
const itemsCache: Record<string, NavTreeItem> = {};

export const getItem = (arg: NodeArg<any>, parent?: readonly string[]): NavTreeItem => {
  const cachedItem = itemsCache[arg.id];
  if (cachedItem) {
    return cachedItem;
  }

  const children = arg.nodes?.filter((node) => !isActionLike(node)) ?? [];
  const actions = arg.nodes?.filter((node) => isActionLike(node)) ?? [];
  const node: Node = {
    id: arg.id,
    type: arg.type,
    properties: arg.properties ?? {},
    data: arg.data ?? null,
  };

  const item = {
    id: arg.id,
    label: arg.properties!.label,
    icon: arg.properties!.icon,
    path: parent ? [...parent, arg.id] : [arg.id],
    ...(children.length > 0 && {
      parentOf: children.map(({ id }) => id),
    }),
    node,
    actions,
    groupedActions: {},
  };
  itemsCache[node.id] = item;
  return item;
};

export const invalidateCache = (id: string) => {
  delete itemsCache[id];
};

const removeItem = (tree: NodeArg<any>, source: NavTreeItem) => {
  const parent = getNode(tree, source.path.slice(1, -1));
  const index = parent.nodes!.findIndex(({ id }) => id === source.id);
  const item = parent.nodes![index];
  parent.nodes!.splice(index, 1);
  return item;
};

const getNode = (tree: NodeArg<any>, path: string[]) => {
  let node = tree;
  for (const part of path) {
    node = node.nodes!.find(({ id }) => id === part)!;
  }
  return node;
};

// TODO(wittjosiah): Reconcile with react-ui-list/Tree/testing.
export const updateState = ({
  state,
  instruction,
  source,
  target,
}: {
  state: NodeArg<any>;
  instruction: Instruction;
  source: NavTreeItem;
  target: NavTreeItem;
}) => {
  switch (instruction.type) {
    case 'reorder-above': {
      invalidateCache(source.id);
      const item = removeItem(state, source);
      const parent = getNode(state, target.path.slice(1, -1));
      const index = parent.nodes!.findIndex(({ id }) => id === target.id);
      invalidateCache(target.id);
      parent.nodes!.splice(index, 0, item);
      break;
    }

    case 'reorder-below': {
      invalidateCache(source.id);
      const item = removeItem(state, source);
      const parent = getNode(state, target.path.slice(1, -1));
      const index = parent.nodes!.findIndex(({ id }) => id === target.id);
      invalidateCache(target.id);
      parent.nodes!.splice(index + 1, 0, item);
      break;
    }

    case 'make-child': {
      invalidateCache(source.id);
      const item = removeItem(state, source);
      const parent = getNode(state, target.path.slice(1));
      invalidateCache(target.id);
      parent.nodes!.push(item);
      break;
    }

    case 'instruction-blocked':
      break;

    default:
      log.warn('Unsupported instruction', instruction);
      break;
  }
};
