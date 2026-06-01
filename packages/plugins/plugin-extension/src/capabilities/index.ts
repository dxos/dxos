//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const ExtensionSettings = Capability.lazy('ExtensionSettings', () => import('./settings'));
export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));
