//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { CreateObjectDialogProps } from './CreateObjectDialog';
export type { RenameSubject } from './RenamePopover';

// Exported eagerly (not lazy): rendered directly by plugin-markdown stories outside a Suspense boundary.
export { ObjectHistory, type ObjectHistoryProps } from './ObjectHistory';

export const CollectionArticle: ComponentType<any> = lazy(() => import('./CollectionArticle'));
export const CollectionSection: ComponentType<any> = lazy(() => import('./CollectionSection'));
export const CreateObjectDialog: ComponentType<any> = lazy(() => import('./CreateObjectDialog'));
export const CreateSpaceDialog: ComponentType<any> = lazy(() => import('./CreateSpaceDialog'));
export const DefaultProperties: ComponentType<any> = lazy(() => import('./DefaultProperties'));
export const ImportSpaceDialog: ComponentType<any> = lazy(() => import('./ImportSpaceDialog'));
export const InlineSyncStatus: ComponentType<any> = lazy(() => import('./InlineSyncStatus'));
export const JoinDialog: ComponentType<any> = lazy(() => import('./JoinDialog'));
export const MembersContainer: ComponentType<any> = lazy(() => import('./MembersContainer'));
export const ObjectCardStack: ComponentType<any> = lazy(() => import('./ObjectCardStack'));
export const RecordArticle: ComponentType<any> = lazy(() => import('./RecordArticle'));
export const RelatedArticle: ComponentType<any> = lazy(() => import('./RelatedArticle'));
export const RenamePopover: ComponentType<any> = lazy(() => import('./RenamePopover'));
export const SchemaContainer: ComponentType<any> = lazy(() => import('./SchemaContainer'));
export const SmallPresenceLive: ComponentType<any> = lazy(() => import('./SmallPresenceLive'));
export const SpacePresence: ComponentType<any> = lazy(() => import('./SpacePresence'));
export const SpaceHomeArticle: ComponentType<any> = lazy(() => import('./SpaceHomeArticle'));
export const SpaceHomeDashboard: ComponentType<any> = lazy(() => import('./SpaceHomeDashboard'));
export const SpaceHomeRecent: ComponentType<any> = lazy(() => import('./SpaceHomeRecent'));
export const SpaceSettings: ComponentType<any> = lazy(() => import('./SpaceSettings'));
export const SpaceSettingsContainer: ComponentType<any> = lazy(() => import('./SpaceSettingsContainer'));
export const SyncStatus: ComponentType<any> = lazy(() => import('./SyncStatus'));
export const TypeArticle: ComponentType<any> = lazy(() => import('./TypeArticle'));
export const ViewEditor: ComponentType<any> = lazy(() => import('./ViewEditor'));
