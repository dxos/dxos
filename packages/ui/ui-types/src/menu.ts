//
// Copyright 2025 DXOS.org
//

import { type ReactNode } from 'react';

import { type Label } from '#translations';

import { type ClassNameValue } from './theme';

/** Shared presentation fields for menu actions and group triggers. */
export type MenuItemChrome = {
  label: Label;
  icon?: string;
  iconOnly?: boolean;
  /** Spins the icon (e.g. while the action's underlying operation is in progress). */
  spin?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  testId?: string;
  /** Shown beside the label; a record is keyed by host platform (`macos`, `windows`, …). */
  keyBinding?: string | Partial<Record<string, string>>;
  /** Applied to the button element rendered for this action. */
  classNames?: ClassNameValue;
  /** Applied to the inner `<Icon>` element when the action renders as an icon button. */
  // TODO(burdon): slots property?
  iconClassNames?: ClassNameValue;
};

// TODO(burdon): Narrow MenuActionProperties to a discriminated union.
export type MenuActionChrome = MenuItemChrome & {
  variant?: 'action' | 'primary' | 'toggle' | 'switch' | 'custom';
  value?: string;
  checked?: boolean;
  /**
   * Renders an arbitrary control in place of the standard button. Required when `variant` is
   * `'custom'`; the contributor owns the element (and its interactions) so the toolbar can host
   * affordances the action model cannot express (e.g. press-and-hold, an embedded dropdown).
   */
  render?: () => ReactNode;
};

export type MenuActionProperties = MenuActionChrome & {
  /**
   * Per-surface chrome overrides, keyed by `disposition` — lets one action declare multiple
   * dispositions (e.g. `['toolbar', 'list-item']`) yet render appropriately in each: a primary
   * toolbar button here, a plain context-menu row there. Applied by the surface bridge that
   * already knows which disposition it's rendering (`graphActions`'s `surface` option,
   * `getListActions`), so producers declare it once alongside `disposition`.
   */
  presentation?: Partial<Record<string, Partial<MenuActionChrome>>>;
};

/** Root toolbar group or plain container with no render variant. */
export type PlainMenuItemGroupProperties = MenuItemChrome & {
  variant?: undefined;
};

type DropdownMenuItemGroupChrome = MenuItemChrome & {
  variant: 'dropdownMenu';
  icon: string;
  /**
   * Whether the dropdown trigger shows a trailing caret. Defaults to `true`.
   * Set to `false` when the icon already signals a menu (e.g. an overflow ⋮).
   */
  caretDown?: boolean;
  /** When true, the trigger icon/label reflects the active child action. */
  applyActive?: boolean;
};

export type DropdownSingleSelectMenuItemGroupProperties = DropdownMenuItemGroupChrome & {
  selectCardinality?: 'single';
  /** Used with `applyActive` to track the selected child. */
  value?: string;
};

export type DropdownMultipleSelectMenuItemGroupProperties = DropdownMenuItemGroupChrome & {
  selectCardinality: 'multiple';
  /** Used with `applyActive` to track the selected children. */
  value?: string[];
};

/**
 * Dropdown trigger opening a menu of child actions.
 *
 * Split by cardinality because a `'multiple'` group suppresses close-on-select, so a mismatched
 * pair would close the menu after the first toggle.
 */
export type DropdownMenuItemGroupProperties =
  | DropdownSingleSelectMenuItemGroupProperties
  | DropdownMultipleSelectMenuItemGroupProperties;

export type ToggleGroupSingleSelectMenuItemGroupProperties = MenuItemChrome & {
  variant: 'toggleGroup';
  selectCardinality: 'single';
  value: string;
};

export type ToggleGroupMultipleSelectMenuItemGroupProperties = MenuItemChrome & {
  variant: 'toggleGroup';
  selectCardinality: 'multiple';
  value: string[];
};

export type ToggleGroupMenuItemGroupProperties =
  | ToggleGroupSingleSelectMenuItemGroupProperties
  | ToggleGroupMultipleSelectMenuItemGroupProperties;

export type MenuItemGroupProperties =
  | PlainMenuItemGroupProperties
  | DropdownMenuItemGroupProperties
  | ToggleGroupMenuItemGroupProperties;

//
// Entries: the plain, source-agnostic model a menu or toolbar renders. Whatever produces a menu (an
// action graph, component state) projects onto these, so the renderer depends on no data source.
//

export type MenuSeparatorVariant = 'gap' | 'line';

/** What a gesture carries to the action it invokes. */
export type MenuInvokeParams = {
  /** The group the invoked entry sits in, when it is not a root entry. */
  parent?: MenuGroupEntry;
  /** Identifies the component that owns the menu. */
  caller?: string;
  /** Input modifiers held during the gesture (e.g. shift-clicking a menu item). */
  modifiers?: { shift?: boolean };
};

export type MenuActionEntry<P extends MenuActionProperties = MenuActionProperties> = {
  id: string;
  kind: 'action';
  properties: P;
  /** Runs the action. Bound by whatever produced the entry, since only it knows how the action executes. */
  invoke?: (params?: MenuInvokeParams) => void | Promise<void>;
};

export type MenuGroupEntry<P extends MenuItemGroupProperties = MenuItemGroupProperties> = {
  id: string;
  kind: 'group';
  properties: P;
};

export type MenuSeparatorEntry = {
  id: string;
  kind: 'separator';
  properties: { variant?: MenuSeparatorVariant };
};

export type MenuEntry = MenuActionEntry | MenuGroupEntry | MenuSeparatorEntry;
