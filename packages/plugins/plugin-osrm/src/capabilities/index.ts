//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const RoutingService = Capability.lazy('RoutingService', () => import('./routing-service'));
