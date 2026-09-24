//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { useMemo } from 'react';

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
