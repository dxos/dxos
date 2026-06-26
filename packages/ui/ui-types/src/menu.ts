//
// Copyright 2025 DXOS.org
//

import { type Label } from '#translations';

import { type ClassNameValue } from './theme';

/** Shared presentation fields for menu actions and group triggers. */
export type MenuItemChrome = {
  label: Label;
  icon?: string;
  iconOnly?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  testId?: string;
  /** Applied to the button element rendered for this action. */
  classNames?: ClassNameValue;
  /** Applied to the inner `<Icon>` element when the action renders as an icon button. */
  // TODO(burdon): slots property?
  iconClassNames?: ClassNameValue;
};

// TODO(burdon): Narrow MenuActionProperties to a discriminated union.
export type MenuActionProperties = MenuItemChrome & {
  variant?: 'action' | 'toggle' | 'switch';
  value?: string;
  checked?: boolean;
};

/** Root toolbar group or plain container with no render variant. */
export type PlainMenuItemGroupProperties = MenuItemChrome & {
  variant?: undefined;
};

/** Dropdown trigger opening a menu of child actions. */
export type DropdownMenuItemGroupProperties = MenuItemChrome & {
  variant: 'dropdownMenu';
  /** Used with `applyActive` to track the selected child. */
  selectCardinality?: 'single';
  value?: string;
  icon: string;
  /**
   * Whether the dropdown trigger shows a trailing caret. Defaults to `true`.
   * Set to `false` when the icon already signals a menu (e.g. an overflow ⋮).
   */
  caretDown?: boolean;
  /** When true, the trigger icon/label reflects the active child action. */
  applyActive?: boolean;
};

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
