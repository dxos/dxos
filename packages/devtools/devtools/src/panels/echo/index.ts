//
// Copyright 2020 DXOS.org
//

import { lazy } from 'react';

export * from './SpaceInfoPanel/index.ts';

export const AutomergePanel = lazy(() => import('./AutomergePanel/index.ts'));
export const FeedsPanel = lazy(() => import('./FeedsPanel/index.ts'));
export const MembersPanel = lazy(() => import('./MembersPanel/index.ts'));
export const MetadataPanel = lazy(() => import('./MetadataPanel/index.ts'));
export const ObjectsPanel = lazy(() => import('./ObjectsPanel/index.ts'));
export const QueuesPanel = lazy(() => import('./QueuesPanel/index.ts'));
export const SpaceInfoPanel = lazy(() => import('./SpaceInfoPanel/index.ts'));
export const SpaceListPanel = lazy(() => import('./SpaceListPanel/index.ts'));
export const SchemaPanel = lazy(() => import('./SchemaPanel/index.ts'));
