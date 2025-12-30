//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const Transcriber = Capability.lazy('Transcriber', () => import('./transcriber'));
