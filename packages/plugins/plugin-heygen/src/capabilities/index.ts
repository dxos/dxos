//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Connector = Capability.lazy('Connector', () => import('./connector'));
export const GenerationService = Capability.lazy('GenerationService', () => import('./generation-service'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
