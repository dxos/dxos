//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';

import { type Node } from '@dxos/app-graph';
import { log } from '@dxos/log';
import { type TreeData } from '@dxos/react-ui-list';

const removeItem = (tree: Node.NodeArg<any>, source: TreeData) => {
  const parent = getNode(tree, source.path.slice(1, -1));
  const index = parent.nodes!.findIndex((node: Node.NodeArg<any>) => node.id === source.id);
  const item = parent.nodes![index];
  parent.nodes!.splice(index, 1);
  return item;
};

const getNode = (tree: Node.NodeArg<any>, path: string[]) => {
  let node = tree;
  for (const part of path) {
    node = node.nodes!.find((n: Node.NodeArg<any>) => n.id === part)!;
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
  state: Node.NodeArg<any>;
  instruction: Instruction;
  source: TreeData;
  target: TreeData;
}) => {
  switch (instruction.type) {
    case 'reorder-above': {
      const item = removeItem(state, source);
      const parent = getNode(state, target.path.slice(1, -1));
      const index = parent.nodes!.findIndex(({ id }) => id === target.id);
      parent.nodes!.splice(index, 0, item);
      break;
    }

    case 'reorder-below': {
      const item = removeItem(state, source);
      const parent = getNode(state, target.path.slice(1, -1));
      const index = parent.nodes!.findIndex(({ id }) => id === target.id);
      parent.nodes!.splice(index + 1, 0, item);
      break;
    }

    case 'make-child': {
      const item = removeItem(state, source);
      const parent = getNode(state, target.path.slice(1));
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
