//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from './meta';

export const CommentsPlugin = Plugin.lazy(meta, () => import('#plugin'));

export * from './meta';

// Additive: lets other plugins embed the comments panel in their own companion surfaces.
export { CommentsArticle } from '#containers';
