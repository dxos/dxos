//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
export const SpacetimeSettings = Capability.lazy('SpacetimeSettings', () => import('./settings'));
