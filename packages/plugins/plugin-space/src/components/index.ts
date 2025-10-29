//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './AwaitingObject';
export * from './CreateDialog';
export * from './CollectionSection';
export * from './JoinDialog';
export * from './MembersContainer';
export * from './MenuFooter';
export * from './PersistenceStatus';
export * from './PopoverRenameObject';
export * from './PopoverRenameSpace';
export * from './SchemaContainer';
export * from './SpacePresence';
export * from './SpacePluginSettings';
export * from './SpaceSettings';
export * from './SyncStatus';
export * from './ViewEditor';

export const CollectionArticle = lazy(() => import('./CollectionArticle'));
export const ObjectDetailsPanel = lazy(() => import('./ObjectDetailsPanel'));
export const ObjectSettingsContainer = lazy(() => import('./ObjectSettings'));
export const RecordArticle = lazy(() => import('./RecordArticle'));
