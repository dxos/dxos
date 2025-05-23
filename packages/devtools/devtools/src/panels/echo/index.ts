//
// Copyright 2020 DXOS.org
//

import { lazy } from 'react';

export * from './SpaceInfoPanel';

export const AutomergePanel = lazy(() => import('./AutomergePanel'));
export const FeedsPanel = lazy(() => import('./FeedsPanel'));
export const MembersPanel = lazy(() => import('./MembersPanel'));
export const MetadataPanel = lazy(() => import('./MetadataPanel'));
export const ObjectsPanel = lazy(() => import('./ObjectsPanel'));
export const QueuesPanel = lazy(() => import('./QueuesPanel'));
export const SpaceInfoPanel = lazy(() => import('./SpaceInfoPanel'));
export const SpaceListPanel = lazy(() => import('./SpaceListPanel'));
export const SchemaPanel = lazy(() => import('./SchemaPanel'));
