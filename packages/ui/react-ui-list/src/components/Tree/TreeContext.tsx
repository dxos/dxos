//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';
import { type Label } from '@dxos/react-ui';

export type TreeItemDataProps = {
  id: string;
  label: Label;
  parentOf?: string[];
  className?: string;
  headingClassName?: string;
  icon?: string;
  iconClassName?: string;
  disabled?: boolean;
  testId?: string;
};

export type TreeContextType<T = any, O = any> = {
  useItems: (parent?: T, options?: O) => T[];
  getProps: (item: T, parent: string[]) => TreeItemDataProps;
  isOpen: (path: string[], item: T) => boolean;
  isCurrent: (path: string[], item: T) => boolean;
};

const TreeContext = createContext<null | TreeContextType>(null);

export const TreeProvider = TreeContext.Provider;

export const useTree = () => useContext(TreeContext) ?? raise(new Error('TreeContext not found'));
