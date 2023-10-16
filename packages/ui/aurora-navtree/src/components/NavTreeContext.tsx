//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext } from 'react';

import { type TreeNode } from '../types';

export type NavTreeContextType = {
  current?: string;
  onSelect?: (params: { path: string; node: TreeNode; level: number; position: number }) => void;
};

const Context = createContext<NavTreeContextType>({});

export const NavTreeProvider = ({ children, ...props }: PropsWithChildren<NavTreeContextType>) => {
  return <Context.Provider value={props}>{children}</Context.Provider>;
};

export const useNavTree = () => useContext(Context);
