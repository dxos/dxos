//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const SketchVariant = Capability.lazy('SketchVariant', () => import('./sketch-variant'));
export const TldrawSettings = Capability.lazy('TldrawSettings', () => import('./settings'));
