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
  icon?: string;
  disabled?: boolean;
  className?: string;
  headingClassName?: string;
  testId?: string;
};

export type TreeContextType<T = any, O = any> = {
  /**
   * Get custom props for node.
   */
  getProps: (item: T, parent: string[]) => TreeItemDataProps;
  /**
   * Get traversal of nodes.
   */
  getChildItems: (parent?: T, options?: O) => T[];
  isOpen: (path: string[], item: T) => boolean;
  isCurrent: (path: string[], item: T) => boolean;
};

const TreeContext = createContext<null | TreeContextType>(null);

export const TreeProvider = TreeContext.Provider;

export const useTree = () => useContext(TreeContext) ?? raise(new Error('TreeContext not found'));
