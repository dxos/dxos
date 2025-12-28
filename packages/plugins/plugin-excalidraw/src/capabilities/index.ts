//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const IntentResolvers = Capability.lazy('IntentResolvers', () => import('./intent-resolver'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const ExcalidrawSettings = Capability.lazy('ExcalidrawSettings', () => import('./settings'));
