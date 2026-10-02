//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { lazyWithPreload } from '@dxos/react-ui';

// Preloadable: search must open on the first keystroke rather than after a chunk fetch.
export const SearchDialog = lazyWithPreload(() => import('./SearchDialog/index.ts'));
export const SearchArticle: ComponentType<any> = lazy(() => import('./SearchArticle/index.ts'));
