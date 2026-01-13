//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AssistantState = Capability.lazy('AssistantState', () => import('./state'));
