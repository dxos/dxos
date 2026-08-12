//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

// Additive: lets other plugins embed the comments panel in their own companion surfaces.

export * from './meta';
export const ReviewPlugin = Plugin.lazy(meta, () => import('#plugin'));
export { CommentsArticle } from '#containers';
export * from './types';
