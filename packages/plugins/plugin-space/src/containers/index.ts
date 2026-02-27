//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { CreateObjectDialogProps } from './CreateObjectDialog/CreateObjectDialog';

export const CollectionArticle: ComponentType<any> = lazy(() => import('./CollectionArticle'));
export const CollectionSection: ComponentType<any> = lazy(() => import('./CollectionSection'));
export const CreateObjectDialog: ComponentType<any> = lazy(() => import('./CreateObjectDialog'));
export const CreateSpaceDialog: ComponentType<any> = lazy(() => import('./CreateSpaceDialog'));
export const InlineSyncStatus: ComponentType<any> = lazy(() => import('./InlineSyncStatus'));
export const JoinDialog: ComponentType<any> = lazy(() => import('./JoinDialog'));
export const MembersContainer: ComponentType<any> = lazy(() => import('./MembersContainer'));
export const MenuFooter: ComponentType<any> = lazy(() => import('./MenuFooter'));
export const ObjectCardStack: ComponentType<any> = lazy(() => import('./ObjectCardStack'));
export const ObjectDetails: ComponentType<any> = lazy(() => import('./ObjectDetails'));
export const ObjectRenamePopover: ComponentType<any> = lazy(() => import('./ObjectRenamePopover'));
export const RecordArticle: ComponentType<any> = lazy(() => import('./RecordArticle'));
export const SchemaContainer: ComponentType<any> = lazy(() => import('./SchemaContainer'));
export const SmallPresenceLive: ComponentType<any> = lazy(() => import('./SmallPresenceLive'));
export const SpacePluginSettings: ComponentType<any> = lazy(() => import('./SpacePluginSettings'));
export const SpacePresence: ComponentType<any> = lazy(() => import('./SpacePresence'));
export const SpaceRenamePopover: ComponentType<any> = lazy(() => import('./SpaceRenamePopover'));
export const SpaceSettingsContainer: ComponentType<any> = lazy(() => import('./SpaceSettingsContainer'));
export const SyncStatus: ComponentType<any> = lazy(() => import('./SyncStatus'));
export const ViewEditor: ComponentType<any> = lazy(() => import('./ViewEditor'));
