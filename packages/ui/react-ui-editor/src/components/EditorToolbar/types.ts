//
// Copyright 2025 DXOS.org
//

import { type EditorViewMode, type Formatting } from '@dxos/ui-editor';

export type EditorToolbarState = Formatting & { viewMode?: EditorViewMode };
