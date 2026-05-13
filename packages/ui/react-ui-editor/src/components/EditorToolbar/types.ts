//
// Copyright 2025 DXOS.org
//

import { type Formatting } from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';

export type EditorToolbarState = Formatting & { viewMode?: EditorViewMode };
