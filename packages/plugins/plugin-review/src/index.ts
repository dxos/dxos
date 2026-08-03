//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const ReviewPlugin = Plugin.lazy(meta, () => import('#plugin'));

export * from './meta';

// Additive: lets other plugins embed the comments panel in their own companion surfaces.
export { CommentsArticle } from '#containers';
export * as CommentCapabilities from './types/CommentCapabilities';
export * as CommentOperation from './types/CommentOperation';
export * as ReviewEvents from './types/ReviewEvents';
export * from './types';
export * as Settings from './types/Settings';
