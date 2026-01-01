//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const OperationHandler = Capability.lazy('OperationHandler', () => import('./operation-handler'));

