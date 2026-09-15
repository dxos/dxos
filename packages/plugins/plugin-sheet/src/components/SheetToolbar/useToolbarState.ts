//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { useContext, useMemo } from 'react';

import { type AlignState } from './align.ts';
import { type StyleState } from './style.ts';

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
export const useToolbarStateRegistry = (): Registry.AtomRegistry => {
  return useContext(RegistryContext);
};
