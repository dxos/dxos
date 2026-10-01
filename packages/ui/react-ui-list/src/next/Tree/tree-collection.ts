//
// Copyright 2026 DXOS.org
//

import { createTreeCollection } from '@ark-ui/react/collection';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { type TreeItemDataProps, type TreeModel } from '../../components/Tree/TreeContext.ts';
import { Path } from '../../util/index.ts';

/** One node handed to zag's tree collection; only nodes on an open path are ever built. */
export type TreeNode<T extends { id: string } = any> = {
  id: string;
  /** Machine value: the joined path, so the same item at two paths keeps independent state. */
  value: string;
  path: string[];
  /** 1-based depth, which is what zag reports as `aria-level`. */
  depth: number;
  /** Absent only on the synthetic root, which zag needs but never renders. */
  item?: T;
  props: TreeItemDataProps;
  branch: boolean;
  open: boolean;
  current: boolean;
  /** Read by zag's `getNodeState` from the node itself (it ignores `isNodeDisabled` there). */
  disabled: boolean;
  /** Built only while the branch is open; a closed branch is marked by `childrenCount` alone. */
  children?: TreeNode<T>[];
  /** Makes zag's `isBranchNode` true for a closed branch whose children were never read. */
  childrenCount?: number;
  indexPath: number[];
};

export type TreeWalk<T extends { id: string } = any> = {
  root: TreeNode<T>;
  /** Pre-order rows under open branches: exactly zag's `visibleNodes`, and what the window slices. */
  rows: TreeNode<T>[];
  expanded: string[];
  selected: string[];
  byValue: Map<string, TreeNode<T>>;
};

/**
 * Reactive walk from `TreeModel` atoms to the nodes zag needs. A closed branch contributes its own row and
 * `childrenCount` (from `props.parentOf`) but never reads `childIds` of its subtree, so the cost of a walk is the
 * number of visible rows, not the size of the tree; opening a branch changes `itemOpen`, which re-runs the walk.
 */
export const createTreeWalkAtom = <T extends { id: string }>(
  model: TreeModel<T>,
  rootId: string | undefined,
  rootPath: string[],
): Atom.Atom<TreeWalk<T>> =>
  Atom.make((get): TreeWalk<T> => {
    const rows: TreeNode<T>[] = [];
    const expanded: string[] = [];
    const selected: string[] = [];
    const byValue = new Map<string, TreeNode<T>>();

    const walk = (parentId: string | undefined, parentPath: string[], parentIndexPath: number[]): TreeNode<T>[] => {
      const nodes: TreeNode<T>[] = [];
      for (const id of get(model.childIds(parentId))) {
        // A cycle in the model would recurse forever; the path already names every ancestor.
        if (parentPath.includes(id)) {
          continue;
        }
        const item = get(model.item(id));
        if (!item) {
          continue;
        }
        const path = [...parentPath, id];
        const props = get(model.itemProps(path));
        const branch = (props.parentOf?.length ?? 0) > 0;
        const open = branch && get(model.itemOpen(path));
        const node: TreeNode<T> = {
          id,
          value: Path.create(...path),
          path,
          depth: parentIndexPath.length + 1,
          item,
          props,
          branch,
          open,
          current: get(model.itemCurrent(path)),
          disabled: !!props.disabled,
          childrenCount: branch ? props.parentOf?.length : undefined,
          indexPath: [...parentIndexPath, nodes.length],
        };
        nodes.push(node);
        rows.push(node);
        byValue.set(node.value, node);
        node.current && selected.push(node.value);
        if (open) {
          expanded.push(node.value);
          node.children = walk(id, path, node.indexPath);
        }
      }
      return nodes;
    };

    const children = walk(rootId, rootPath, []);
    const root: TreeNode<T> = {
      id: rootId ?? '',
      value: Path.create(...rootPath),
      path: rootPath,
      depth: 0,
      props: { id: rootId ?? '', label: '' },
      branch: true,
      open: true,
      current: false,
      disabled: false,
      children,
      indexPath: [],
    };
    return { root, rows, expanded, selected, byValue };
  });

/** A row's label as typeahead matches it; a translated label needs the caller's `toString`. */
const defaultNodeToString = (node: TreeNode) => (typeof node.props.label === 'string' ? node.props.label : node.id);

/** zag's collection over a walk; never asked for the children of a closed branch. */
export const createCollection = <T extends { id: string }>(
  root: TreeNode<T>,
  nodeToString: (node: TreeNode<T>) => string = defaultNodeToString,
) =>
  createTreeCollection<TreeNode<T>>({
    rootNode: root,
    nodeToValue: (node) => node.value,
    nodeToString,
    nodeToChildren: (node) => node.children ?? [],
    nodeToChildrenCount: (node) => node.childrenCount,
    isNodeDisabled: (node) => !!node.props.disabled,
  });
