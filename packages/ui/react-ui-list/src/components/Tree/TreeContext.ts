//
// Copyright 2026 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from 'react';

import { type VirtualMode, createContext } from '@dxos/react-ui';

import { type TreeNode, type TreeWalk } from './tree-collection.ts';
import { type TreeData } from './tree-data.ts';
import { type DropKind, type RowActivation } from './tree-model.ts';

// Kept out of the component module: react-refresh only fast-refreshes a module whose exports are all components.

/** `fixed` windows rows of one block each; `variable` mounts every row with `content-visibility: auto`. */
export type TreeVirtual = VirtualMode;

/** A disclosure in flight: the rows under `path` fade in (`open`) or conceal before the close commits. */
export type TreeDisclosure = { value: string; path: string[]; open: boolean };

export type TreeContextValue = {
  treeId: string;
  walk: TreeWalk;
  virtual?: TreeVirtual;
  draggable: boolean;
  /** `false` keeps the browser's snapshot of the row; otherwise a `DragPreview` chip is drawn. */
  dragPreview: boolean;
  /** The chip's content; the default is the row's icon and label. */
  renderDragPreview?: (node: TreeNode) => ReactNode;
  indentGuides: boolean;
  /** Whether a childless row offers a make-child zone. */
  leavesAcceptChildren: boolean;
  /** Offer an open branch a reorder-below zone meaning "after this row and its subtree". */
  dropBelowExpanded: boolean;
  /** Render a strip after the last row that accepts a drop meaning "append at the end". */
  dropAtEnd: boolean;
  /** Take the dragged row out of the list for the drag, rather than fading it in place. */
  hideDragSource: boolean;
  selectionMode: 'single' | 'multiple';
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  getDropKind?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => DropKind;
  /** Whether the consumer lets the row be selected; a branch that cannot be toggles instead. */
  allowsSelect: (node: TreeNode) => boolean;
  /** Applies the select-or-toggle policy to a row activation. */
  selectNode: (node: TreeNode, activation: RowActivation) => void;
  onItemHover?: (node: TreeNode) => void;
  /** Every disclosure goes through here, so an animated close can hold its rows until they have concealed. */
  setOpen: (node: TreeNode, open: boolean) => void;
  disclosures: readonly TreeDisclosure[];
  /** The machine's roving tabstop; a windowed tree keeps this row mounted while it is out of view. */
  focusedValue: string | null;
  /** Takes DOM focus for a row the tree is waiting to focus (after a drop, or a windowed jump) once it is mounted. */
  claimFocus: (value: string, row: HTMLElement) => void;
  /** Set by Content when windowed; zag calls it before focusing a row it may not have mounted. */
  scrollToIndexRef: RefObject<((index: number) => void) | null>;
  /** Handlers for the tree element: they run before the machine's, so they can take a key from it. */
  onTreeKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onTreePointerDownCapture: (event: PointerEvent<HTMLDivElement>) => void;
};

// Behaviour only (drop policy, walk), never size or level (Next decision 3).
export const [TreeProvider, useTreeContext] = createContext<TreeContextValue>('Tree.Root');

export type TreeItemContextValue = {
  node: TreeNode;
};

export const [TreeItemProvider, useTreeItemContext] = createContext<TreeItemContextValue>('Tree.Item');
