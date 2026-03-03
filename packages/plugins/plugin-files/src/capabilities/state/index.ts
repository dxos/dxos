//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const FileState = Capability.lazy('FileState', () => import('./state'));
