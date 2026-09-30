//
// Copyright 2020 DXOS.org
//

import { lazy } from 'react';

export { DatabaseStatsInfo } from './SpaceInfoArticle/DatabaseStatsInfo.tsx';
export { SyncStateInfo } from './SpaceInfoArticle/SyncStateInfo.tsx';

export const AutomergeArticle = lazy(() => import('./AutomergeArticle/index.ts'));
export const FeedsArticle = lazy(() => import('./FeedsArticle/index.ts'));
export const MembersArticle = lazy(() => import('./MembersArticle/index.ts'));
export const MetadataArticle = lazy(() => import('./MetadataArticle/index.ts'));
export const ObjectsArticle = lazy(() => import('./ObjectsArticle/index.ts'));
export const QueuesArticle = lazy(() => import('./QueuesArticle/index.ts'));
export const SpaceInfoArticle = lazy(() => import('./SpaceInfoArticle/index.ts'));
export const SpaceListArticle = lazy(() => import('./SpaceListArticle/index.ts'));
export const SchemaArticle = lazy(() => import('./SchemaArticle/index.ts'));
