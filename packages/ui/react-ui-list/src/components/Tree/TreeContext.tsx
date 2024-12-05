//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Label } from '@dxos/react-ui';

export type PropsFromTreeItem = {
  id: string;
  label: Label;
  parentOf?: string[];
  icon?: string;
  disabled?: boolean;
  className?: string;
  headingClassName?: string;
  testId?: string;
};

export type TreeContextType<T = any> = {
  getItems: (parent?: T) => T[];
  getProps: (item: T, parent: string[]) => PropsFromTreeItem;
  isOpen: (path: string[], item: T) => boolean;
  isCurrent: (path: string[], item: T) => boolean;
};

const TreeContext = createContext<null | TreeContextType>(null);

export const useTree = () => useContext(TreeContext) ?? raise(new Error('TreeContext not found'));

export const TreeProvider = TreeContext.Provider;
