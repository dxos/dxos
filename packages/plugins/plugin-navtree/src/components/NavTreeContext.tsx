//
// Copyright 2025 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type NavTreeContextValue } from './types';

export const NavTreeContext = createContext<NavTreeContextValue | null>(null);

export const useNavTreeContext = () => useContext(NavTreeContext) ?? raise(new Error('NavTreeContext not found'));
