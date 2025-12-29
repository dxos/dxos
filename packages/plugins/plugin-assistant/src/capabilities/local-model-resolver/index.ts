//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const LocalModelResolver = Capability.lazy('LocalModelResolver', () => import('./local-model-resolver'));

