//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const CallExtension = Capability.lazy('CallExtension', () => import('./call-extension'));

