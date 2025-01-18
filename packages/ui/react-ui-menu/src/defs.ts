//
// Copyright 2025 DXOS.org
//
import { type Node, type Action } from '@dxos/app-graph';
import { type Label } from '@dxos/react-ui';

export type MenuActionProperties = {
  label: Label;
  icon: string;
  value?: string;
  disabled?: boolean;
  iconOnly?: boolean;
  testId?: string;
  variant?: 'action' | 'toggle';
  checked?: boolean;
};

export type MenuAction = Action<MenuActionProperties>;

export type MenuProps<I extends Node = Action<MenuActionProperties>, A extends Node = I> = {
  items?: I[];
  onAction?: (action: A) => void;
};
