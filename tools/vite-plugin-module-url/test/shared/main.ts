//
// Copyright 2026 DXOS.org
//

import pluginUrl from './plugin.ts?module-url';

export const worker = (): Worker => new Worker(new URL('./host.ts', import.meta.url), { type: 'module' });

export { pluginUrl };
