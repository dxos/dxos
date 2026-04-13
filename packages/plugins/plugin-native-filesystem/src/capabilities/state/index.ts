//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export * as FilesystemManager from './FilesystemManager';
export const State = Capability.lazy('State', () => import('./state'));
