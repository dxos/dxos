//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, type ReactNode } from 'react';

import { type MosaicOperation, type MosaicDraggedItem, useMosaic } from '@dxos/react-ui-mosaic';

import type { NavTreeItemNode, NavTreeNode } from '../types';

export type NavTreeContextType = {
  current?: Set<string>;
  attended?: Set<string>;
  open?: Set<string>;
  popoverAnchorId?: string;
  onNavigate?: (params: NavTreeItemNode & Partial<{ position: number; open: boolean }>) => void;
  onItemOpenChange?: (params: NavTreeItemNode & Partial<{ position: number; open: boolean }>) => void;
  isOver: (path: string) => boolean;
  renderPresence?: (node: NavTreeNode) => ReactNode;
};

const Context = createContext<NavTreeContextType>({ isOver: () => false });

export type NavTreeProviderProps = PropsWithChildren<
  Omit<NavTreeContextType, 'isOver'> & {
    isOver: (params: {
      path: string;
      operation: MosaicOperation;
      activeItem?: MosaicDraggedItem;
      overItem?: MosaicDraggedItem;
    }) => boolean;
  }
>;

export const NavTreeProvider = ({ children, ...props }: NavTreeProviderProps) => {
  const { operation, activeItem, overItem } = useMosaic();
  const isOver = (path: string) => props.isOver({ path, operation, activeItem, overItem });
  return <Context.Provider value={{ ...props, isOver }}>{children}</Context.Provider>;
};

export const useNavTree = () => useContext(Context);
