//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const UndoMappings = Capability.lazy('UndoMappings', () => import('./undo-mappings'));
