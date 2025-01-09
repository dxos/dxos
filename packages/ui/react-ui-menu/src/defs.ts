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
};

export type MenuProps<A extends Node = Action> = {
  actions?: A[];
  onAction?: (action: A) => void;
};
