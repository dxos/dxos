//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { useContext, useMemo } from 'react';

import { type AlignState } from './align';
import { type StyleState } from './style';

export type ToolbarState = Partial<StyleState & AlignState>;
export type ToolbarStateAtom = Atom.Writable<ToolbarState>;

/**
 * Creates a reactive toolbar state Atom.
 */
export const useToolbarState = (initialState: ToolbarState = {}): ToolbarStateAtom => {
  return useMemo(() => Atom.make<ToolbarState>(initialState).pipe(Atom.keepAlive), []);
};

/**
 * Hook to read the current toolbar state value.
 */
export const useToolbarStateValue = (stateAtom: ToolbarStateAtom): ToolbarState => {
  return useAtomValue(stateAtom);
};

/**
 * Hook to get the registry for updating toolbar state.
 */
export const useToolbarStateRegistry = (): Registry.Registry => {
  return useContext(RegistryContext);
};
