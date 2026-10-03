//
// Copyright 2024 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

export type TreeItemDataProps = {
  id: string;
  label: ThemeProvider.Label;
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

/** Keys held for a row activation; `meta` covers ctrl on non-Mac keyboards. */
export type SelectModifiers = {
  option: boolean;
  shift: boolean;
  meta: boolean;
  /** Activated from the keyboard (Enter) rather than the pointer, so a consumer can move focus on. */
  keyboard?: boolean;
};

/** A row activation: the keys it was made with, and the selection the row takes from it. */
export type RowActivation = SelectModifiers & { current: boolean };

/** What a drop does: `move` relocates the item, `link` adds a reference and leaves it where it is, `reject` blocks it. */
export type DropKind = 'move' | 'link' | 'reject';
