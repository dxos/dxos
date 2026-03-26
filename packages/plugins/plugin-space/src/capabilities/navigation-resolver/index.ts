//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const NavigationResolver = Capability.lazy('NavigationResolver', () => import('./navigation-resolver'));
