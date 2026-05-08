//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { MarkdownCapabilities, MarkdownEvents } from './types';

export * from './meta';
export * from './types';
export * from './util';

export const MarkdownPlugin = Plugin.lazy(meta, () => import('#plugin'));
