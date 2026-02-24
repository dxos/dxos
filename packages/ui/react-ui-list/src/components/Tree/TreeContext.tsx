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
  iconHue?: string;
  disabled?: boolean;
  testId?: string;
};

export type TreeContextType<T = any> = {
  getProps: (item: T, parent: string[]) => TreeItemDataProps;
  /** Hook that subscribes to and returns the open state for a tree item. */
  useIsOpen: (path: string[], item: T) => boolean;
  /** Hook that subscribes to and returns the current state for a tree item. */
  useIsCurrent: (path: string[], item: T) => boolean;
  /** Subscribe to child IDs only (topology), avoiding content subscription. */
  useChildIds: (parent?: T) => string[];
  /** Subscribe to a single item by ID (content only). */
  useItem: (id: string) => T | undefined;
};

const TreeContext = createContext<null | TreeContextType>(null);

export const TreeProvider = TreeContext.Provider;

export const useTree = () => useContext(TreeContext) ?? raise(new Error('TreeContext not found'));
