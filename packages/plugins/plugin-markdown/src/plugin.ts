//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const MarkdownPlugin = Plugin.lazy(meta, () => import('#plugin'));

export { MarkdownOperationHandlerSet } from './operations';
