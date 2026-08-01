//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const DrawingVariant = Capability.lazy('DrawingVariant', () => import('./drawing-variant'));
export const TldrawSettings = Capability.lazy('TldrawSettings', () => import('./settings'));
