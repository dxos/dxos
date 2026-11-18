//
// Copyright 2026 DXOS.org
//

import { type EditorToolbarState } from './types.ts';

/** A read-only editor still runs dispatched commands, so its editing actions are disabled. */
export const isReadonly = (state: EditorToolbarState): boolean => state.viewMode === 'readonly';
