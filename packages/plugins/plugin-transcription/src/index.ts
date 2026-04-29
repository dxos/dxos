//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const TranscriptionPlugin = Plugin.lazy(meta, () => import('./TranscriptionPlugin'));

export { TranscriptionCapabilities } from './types';

export * from './components';
export * from './hooks';
export * from './transcriber';
