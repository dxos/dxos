//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AiService = Capability.lazy('AiService', () => import('./ai-service'));

