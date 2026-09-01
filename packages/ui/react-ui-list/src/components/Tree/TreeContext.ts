//
// Copyright 2024 DXOS.org
//

import { type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import type * as Atom from 'effect/unstable/reactivity/Atom';
import { type FC, type MutableRefObject, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Label } from '@dxos/react-ui';

import { type TreeData } from './tree-data';

// Kept out of the tree components: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and hook exported beside one force a full page reload on every edit.

export type TreeItemDataProps = {
  id: string;
  label: Label;
  parentOf?: string[];
  /** Pass-through of the node's disposition; the tree uses this to branch render mode (e.g. `'group'` → section header). */
  disposition?: string;
  /** When `false`, the item cannot be dragged (overrides tree-level `draggable`). */
  draggable?: boolean;
  /** When `false`, the item does not participate as a drop target. */
  droppable?: boolean;
  className?: string;
  headingClassName?: string;
  icon?: string;
  iconHue?: string;
  disabled?: boolean;
  testId?: string;
  /** Optional item count rendered as a neutral badge directly after the label. */
  count?: number;
  /** Optional count of new/modified items; when greater than zero it shows as a rose badge in place of `count`. */
  modifiedCount?: number;
};

export interface TreeModel<T extends { id: string } = any> {
  /** Atom family: resolve item by ID (content). */
  item: (id: string) => Atom.Atom<T | undefined>;
  /** Atom family: open state keyed by path. */
  itemOpen: (path: string[]) => Atom.Atom<boolean>;
  /** Atom family: current (selected) state keyed by path. */
  itemCurrent: (path: string[]) => Atom.Atom<boolean>;
  /** Atom family: display props for an item at a given path (path includes item's own ID at end). */
  itemProps: (path: string[]) => Atom.Atom<TreeItemDataProps>;
  /** Atom family: outbound child IDs for a parent ID (topology). Undefined = root. */
  childIds: (parentId?: string) => Atom.Atom<string[]>;
}

/**
 * One node of the reactive walk over a {@link TreeModel}: the collection node handed to Ark's
 * TreeView machine, and the render node the tree recurses over (`children` keeps group wrappers;
 * the collection sees groups spliced out via `nodeToChildren`).
 */
export type TreeNodeEntry<T extends { id: string } = any> = {
  id: string;
  /** Machine value — the joined path, so state stays per-path (the same node at two paths is independent). */
  value: string;
  path: string[];
  /** Indentation level (group children stay at their header's level). */
  level: number;
  last: boolean;
  item: T;
  props: TreeItemDataProps;
  group: boolean;
  branch: boolean;
  open: boolean;
  current: boolean;
  /** Marks unloaded branches for the machine (`isBranchNode` needs children or a count). */
  childrenCount?: number;
  children?: TreeNodeEntry<T>[];
  /** Index path within the collection (groups spliced), assigned after the walk. */
  indexPath: number[];
};

/**
 * Replaces the heading's leading icon. `TreeItemDataProps.icon` names a static glyph; a caller whose
 * icon carries its own state — an animation, a tooltip, a per-state hue — needs to render it itself.
 */
export type IconRenderer<T extends { id: string } = any> = FC<{
  item: T;
  path: string[];
  props: TreeItemDataProps;
}>;

/**
 * Replaces the heading — the row's leading content beside the toggle. `TreeItemDataProps` describes
 * a label with an optional icon and count; a caller whose row leads with its own controls (a
 * checkbox, an inline-editable title) supplies them here instead.
 */
export type HeadingRenderer<T extends { id: string } = any> = FC<{
  item: T;
  path: string[];
  props: TreeItemDataProps;
  open: boolean;
}>;

export type ColumnRenderer<T extends { id: string } = any> = FC<{
  item: T;
  path: string[];
  open: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}>;

/** Render-time context threaded to every row. */
export type TreeRenderContextValue<T extends { id: string } = any> = {
  draggable: boolean;
  renderColumns?: ColumnRenderer<T>;
  renderIcon?: IconRenderer<T>;
  renderHeading?: HeadingRenderer<T>;
  blockInstruction?: (params: { instruction: Instruction; source: TreeData; target: TreeData }) => boolean;
  canDrop?: (params: { source: TreeData; target: TreeData }) => boolean;
  /** Whether a childless row can be dropped onto to adopt the dragged item. */
  leavesAcceptChildren?: boolean;
  /** Paint every row's drop bands, so the zones can be seen without holding a drag. */
  debug?: boolean;
  onOpenChange?: (params: { item: T; path: string[]; open: boolean }) => void;
  onItemHover?: (params: { item: T }) => void;
  /** Applies the select-vs-toggle policy for a row activation. */
  selectNode: (node: TreeNodeEntry<T>, modifiers: { option: boolean; shift: boolean }) => void;
  /** False during the tree's initial commit — disclosure inserted then must not animate. */
  mountedRef: MutableRefObject<boolean>;
  /** Branch values currently running their conceal animation before the close commits. */
  closingValues: ReadonlySet<string>;
  /** Commits the model close for a branch once its conceal animation ends. */
  commitClose: (node: TreeNodeEntry) => void;
};

const TreeRenderContext = createContext<TreeRenderContextValue | null>(null);

export const TreeRenderProvider = TreeRenderContext.Provider;

export const useTreeRender = <T extends { id: string } = any>(): TreeRenderContextValue<T> =>
  useContext(TreeRenderContext) ?? raise(new Error('TreeRenderContext not found'));
