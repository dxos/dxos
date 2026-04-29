//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export { meta };
export const MarkdownPlugin = Plugin.lazy(meta, () => import('./MarkdownPlugin'));
