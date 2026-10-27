//
// Copyright 2026 DXOS.org
//

import { realm } from '#realm';

export const worker = (): Worker => new Worker(new URL('./host.ts', import.meta.url), { type: 'module' });

export const pageRealm = realm;
