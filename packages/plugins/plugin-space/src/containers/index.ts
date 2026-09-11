//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type ObjectMasonryArticleProps } from './ObjectMasonry/index.ts';

export type { ObjectFormDialogProps } from './ObjectFormDialog/index.ts';
export type { ObjectMasonryArticleProps };
export type { RenameSubject } from './RenamePopover/index.ts';

export const CollectionArticle: ComponentType<any> = lazy(() => import('./CollectionArticle/index.ts'));
export const CollectionSection: ComponentType<any> = lazy(() => import('./CollectionSection/index.ts'));
export const CreateSpaceDialog: ComponentType<any> = lazy(() => import('./CreateSpaceDialog/index.ts'));
export const DefaultProperties: ComponentType<any> = lazy(() => import('./DefaultProperties/index.ts'));
export const ImportSpaceDialog: ComponentType<any> = lazy(() => import('./ImportSpaceDialog/index.ts'));
export const InlineSyncStatus: ComponentType<any> = lazy(() => import('./InlineSyncStatus/index.ts'));
export const JoinDialog: ComponentType<any> = lazy(() => import('./JoinDialog/index.ts'));
export const MembersContainer: ComponentType<any> = lazy(() => import('./MembersContainer/index.ts'));
export const MergePreview: ComponentType<any> = lazy(() => import('./MergePreview/index.ts'));
export const ObjectCardStack: ComponentType<any> = lazy(() => import('./ObjectCardStack/index.ts'));
// Lazy like its siblings — the masonry and card stack are a chunk no consumer should pay for until
// it renders one.
export const ObjectMasonryArticle: ComponentType<ObjectMasonryArticleProps> = lazy(() =>
  import('./ObjectMasonry/index.ts').then(({ ObjectMasonryArticle }) => ({ default: ObjectMasonryArticle })),
);
export const ObjectFormDialog: ComponentType<any> = lazy(() => import('./ObjectFormDialog/index.ts'));
export const RecordArticle: ComponentType<any> = lazy(() => import('./RecordArticle/index.ts'));
export const RelatedArticle: ComponentType<any> = lazy(() => import('./RelatedArticle/index.ts'));
export const RenamePopover: ComponentType<any> = lazy(() => import('./RenamePopover/index.ts'));
export const SchemaContainer: ComponentType<any> = lazy(() => import('./SchemaContainer/index.ts'));
export const SmallPresenceLive: ComponentType<any> = lazy(() => import('./SmallPresenceLive/index.ts'));
export const SpacePresence: ComponentType<any> = lazy(() => import('./SpacePresence/index.ts'));
export const SpaceHomeArticle: ComponentType<any> = lazy(() => import('./SpaceHomeArticle/index.ts'));
export const SpaceHomeDashboard: ComponentType<any> = lazy(() => import('./SpaceHomeDashboard/index.ts'));
export const SpaceHomeRecent: ComponentType<any> = lazy(() => import('./SpaceHomeRecent/index.ts'));
export const SpaceSettings: ComponentType<any> = lazy(() => import('./SpaceSettings/index.ts'));
export const SpaceSettingsContainer: ComponentType<any> = lazy(() => import('./SpaceSettingsContainer/index.ts'));
export const SyncStatus: ComponentType<any> = lazy(() => import('./SyncStatus/index.ts'));
export const TypeArticle: ComponentType<any> = lazy(() => import('./TypeArticle/index.ts'));
export const ViewEditor: ComponentType<any> = lazy(() => import('./ViewEditor/index.ts'));
