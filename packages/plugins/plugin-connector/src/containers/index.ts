//
// Copyright 2025 DXOS.org
//

import { type ComponentType, type LazyExoticComponent, lazy } from 'react';

import type { ConnectionArticleProps } from './ConnectionArticle';
import type { ConnectionSettingsArticleProps } from './ConnectionSettingsArticle';
import type { ConnectorCompanionProps } from './ConnectorCompanion';
import type { CustomTokenDialogProps } from './CustomTokenDialog';
import type { SyncTargetsDialogProps } from './SyncTargetsDialog';

export const ConnectionArticle: LazyExoticComponent<ComponentType<ConnectionArticleProps>> = lazy(
  () => import('./ConnectionArticle'),
);
export const ConnectionSettingsArticle: LazyExoticComponent<ComponentType<ConnectionSettingsArticleProps>> = lazy(
  () => import('./ConnectionSettingsArticle'),
);
export const ConnectorCompanion: LazyExoticComponent<ComponentType<ConnectorCompanionProps>> = lazy(
  () => import('./ConnectorCompanion'),
);
export const SyncTargetsDialog: LazyExoticComponent<ComponentType<SyncTargetsDialogProps>> = lazy(
  () => import('./SyncTargetsDialog'),
);
export const CustomTokenDialog: LazyExoticComponent<ComponentType<CustomTokenDialogProps>> = lazy(
  () => import('./CustomTokenDialog'),
);
