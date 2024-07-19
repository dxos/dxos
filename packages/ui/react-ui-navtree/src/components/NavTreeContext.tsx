//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, type ReactNode, type CSSProperties } from 'react';

import type { NavTreeItemNode, NavTreeNode } from '../types';

export type NavTreeContextType = {
  current?: Set<string>;
  attended?: Set<string>;
  open?: Set<string>;
  popoverAnchorId?: string;
  onNavigate?: (item: NavTreeItemNode) => void;
  onItemOpenChange?: (item: NavTreeItemNode, nextOpen: boolean) => void;
  renderPresence?: (node: NavTreeNode) => ReactNode;
  resolveItemLevel?: (
    overItemPosition: number | undefined,
    activeItemId: string | undefined,
    levelOffset: number,
  ) => number;
  indentation?: (level: number) => CSSProperties;
};

const Context = createContext<NavTreeContextType>({});

export type NavTreeProviderProps = PropsWithChildren<NavTreeContextType>;

export const NavTreeProvider = ({ children, ...props }: NavTreeProviderProps) => {
  return <Context.Provider value={props}>{children}</Context.Provider>;
};

export const useNavTree = () => useContext(Context);
