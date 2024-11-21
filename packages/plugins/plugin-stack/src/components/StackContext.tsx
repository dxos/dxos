//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type AddSectionPosition } from '../types';

export type StackContextValue = {
  onCollapse: (id: string, collapsed: boolean) => void;
  onNavigate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: (id: string, position: AddSectionPosition) => void;
};

export const StackContext = createContext<StackContextValue>({
  onCollapse: () => {},
  onNavigate: async () => {},
  onDelete: async () => {},
  onAdd: () => {},
});

export const useStack = () => useContext(StackContext);
