//
// Copyright 2026 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type ReactNode, type RefObject } from 'react';

import { createContext } from '@dxos/react-ui';

import { type TreeData } from '../../components/Tree/tree-data.ts';
import { type DropKind } from '../../components/Tree/TreeDropIndicator.tsx';
import { type TreeNode, type TreeWalk } from './tree-collection.ts';

// Kept out of the component module: react-refresh only fast-refreshes a module whose exports are all components.

/** `fixed` windows rows of one block each; `variable` mounts every row with `content-visibility: auto`. */
export type TreeVirtual = 'fixed' | 'variable';

/** A disclosure in flight: the rows under `path` fade in (`open`) or conceal before the close commits. */
export type TreeDisclosure = { value: string; path: string[]; open: boolean };

export type TreeContextValue = {
  treeId: string;
  walk: TreeWalk;
  virtual?: TreeVirtual;
  draggable: boolean;
  /** `false` keeps the browser's snapshot of the row; otherwise a `Next.DragPreview` chip is drawn. */
  dragPreview: boolean;
  /** The chip's content; the default is the row's icon and label. */
  renderDragPreview?: (node: TreeNode) => ReactNode;
  indentGuides: boolean;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  getDropKind?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => DropKind;
  /** Every disclosure goes through here, so an animated close can hold its rows until they have concealed. */
  setOpen: (node: TreeNode, open: boolean) => void;
  disclosures: readonly TreeDisclosure[];
  /** Set by Content when windowed; zag calls it before focusing a row it may not have mounted. */
  scrollToIndexRef: RefObject<((index: number) => void) | null>;
};

// Behaviour only (drop policy, walk), never size or level (Next decision 3).
export const [TreeProvider, useTreeContext] = createContext<TreeContextValue>('Tree.Root');

export type TreeItemContextValue = {
  node: TreeNode;
};

export const [TreeItemProvider, useTreeItemContext] = createContext<TreeItemContextValue>('Tree.Item');
