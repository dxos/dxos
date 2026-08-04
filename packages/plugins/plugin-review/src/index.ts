//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

// Additive: lets other plugins embed the comments panel in their own companion surfaces.

export * as AgentIdentity from './types/AgentIdentity';
export * as CommentCapabilities from './types/CommentCapabilities';
export * as CommentOperation from './types/CommentOperation';
export * as ReviewCapabilities from './types/ReviewCapabilities';
export * as ReviewEvents from './types/ReviewEvents';
export * as Settings from './types/Settings';
export * from './meta';
export const ReviewPlugin = Plugin.lazy(meta, () => import('#plugin'));
export { CommentsArticle } from '#containers';
