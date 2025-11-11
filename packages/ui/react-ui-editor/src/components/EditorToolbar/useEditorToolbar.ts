//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Live, live } from '@dxos/live-object';

import { type Formatting } from '../../extensions';
import { type EditorViewMode } from '../../types';

export type EditorToolbarState = { viewMode?: EditorViewMode } & Formatting;

/**
 * @deprecated Use Editor.Root
 */
export const useEditorToolbar = (initialState: Partial<EditorToolbarState> = {}): Live<EditorToolbarState> => {
  return useMemo(() => live<EditorToolbarState>(initialState), []);
};
