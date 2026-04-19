//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';

export const AutoSync = Capability.lazy('AutoSync', () => import('./auto-sync'));
export * from './linear-client';
