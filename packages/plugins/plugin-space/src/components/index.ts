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
export * from './ObjectRenamePopover';
export * from './SchemaContainer';
export * from './SpacePluginSettings';
export * from './SpacePresence';
export * from './SpaceRenamePopover';
export * from './SpaceSettings';
export * from './SyncStatus';
export * from './ViewEditor';

export const CollectionArticle = lazy(() => import('./CollectionArticle'));
export const ObjectCardStack = lazy(() => import('./ObjectCardStack'));
export const ObjectDetails = lazy(() => import('./ObjectDetails'));
export const RecordArticle = lazy(() => import('./RecordArticle'));
