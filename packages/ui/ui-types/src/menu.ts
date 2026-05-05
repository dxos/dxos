//
// Copyright 2025 DXOS.org
//

import { type Label } from '#translations';

import { type ClassNameValue } from './theme';

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
  classNames?: ClassNameValue;
};

export type MenuItemGroupProperties = {
  label: Label;
  icon?: string;
  iconOnly?: boolean;
};
