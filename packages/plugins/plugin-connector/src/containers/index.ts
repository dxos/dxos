//
// Copyright 2025 DXOS.org
//

import { type ComponentType, type LazyExoticComponent, lazy } from 'react';

import type { ConnectionArticleProps } from './ConnectionArticle/index.ts';
import type { ConnectionSettingsArticleProps } from './ConnectionSettingsArticle/index.ts';
import type { ConnectorCompanionProps } from './ConnectorCompanion/index.ts';
import type { CustomTokenDialogProps } from './CustomTokenDialog/index.ts';
import type { SyncTargetsDialogProps } from './SyncTargetsDialog/index.ts';

export const ConnectionArticle: LazyExoticComponent<ComponentType<ConnectionArticleProps>> = lazy(
  () => import('./ConnectionArticle/index.ts'),
);
export const ConnectionSettingsArticle: LazyExoticComponent<ComponentType<ConnectionSettingsArticleProps>> = lazy(
  () => import('./ConnectionSettingsArticle/index.ts'),
);
export const ConnectorCompanion: LazyExoticComponent<ComponentType<ConnectorCompanionProps>> = lazy(
  () => import('./ConnectorCompanion/index.ts'),
);
export const SyncTargetsDialog: LazyExoticComponent<ComponentType<SyncTargetsDialogProps>> = lazy(
  () => import('./SyncTargetsDialog/index.ts'),
);
export const CustomTokenDialog: LazyExoticComponent<ComponentType<CustomTokenDialogProps>> = lazy(
  () => import('./CustomTokenDialog/index.ts'),
);
