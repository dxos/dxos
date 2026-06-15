//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = Capability.lazy('NavigationHandler', () => import('./navigation-handler'));
