//
// Copyright 2025 DXOS.org
//

import { type Label } from '#translations';

import { type ClassNameValue } from './theme';

// TOOD(burdon): Narrow type to specific action types.
export type MenuActionProperties = {
  label: Label;
  icon?: string;
  value?: string;
  disabled?: boolean;
  hidden?: boolean;
  iconOnly?: boolean;
  testId?: string;
  variant?: 'action' | 'toggle';
  checked?: boolean;
  /** Applied to the button element rendered for this action. */
  classNames?: ClassNameValue;
  /** Applied to the inner `<Icon>` element when the action renders as an icon button. */
  iconClassNames?: ClassNameValue;
};

export type MenuItemGroupProperties = {
  label: Label;
  icon?: string;
  iconOnly?: boolean;
};
