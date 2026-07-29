//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ExcalidrawSettings = Capability.lazy('ExcalidrawSettings', () => import('./settings'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const DrawingVariant = Capability.lazy('DrawingVariant', () => import('./drawing-variant'));
