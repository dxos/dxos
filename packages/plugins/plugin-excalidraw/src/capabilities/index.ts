//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ExcalidrawSettings = Capability.lazy('ExcalidrawSettings', () => import('./settings'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SketchVariant = Capability.lazy('SketchVariant', () => import('./sketch-variant'));
