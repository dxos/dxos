//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { type EditorViewMode, type Formatting } from '@dxos/ui-editor';

// TODO(burdon): Move to extensions.
export type EditorToolbarState = { viewMode?: EditorViewMode } & Formatting;

/**
 * Creates an atom for editor toolbar state.
 * @deprecated Use Editor.Root
 */
export const useEditorToolbar = (initialState: EditorToolbarState = {}): Atom.Writable<EditorToolbarState> => {
  // TODO(wittjosiah): Including initialState in the deps causes reactivity issues.
  return useMemo(() => Atom.make<EditorToolbarState>(initialState), []);
};
