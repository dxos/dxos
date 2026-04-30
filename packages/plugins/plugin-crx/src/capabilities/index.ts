//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CrxSettings = Capability.lazy('CrxSettings', () => import('./settings'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
