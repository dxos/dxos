//
// Copyright 2025 DXOS.org
//

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import type { CustomTokenDialogProps } from './CustomTokenDialog';
import type { IntegrationArticleProps } from './IntegrationArticle';
import type { IntegrationSettingsArticleProps } from './IntegrationSettingsArticle';
import type { SyncTargetsDialogProps } from './SyncTargetsDialog';

export const IntegrationArticle: LazyExoticComponent<ComponentType<IntegrationArticleProps>> = lazy(
  () => import('./IntegrationArticle'),
);
export const IntegrationSettingsArticle: LazyExoticComponent<ComponentType<IntegrationSettingsArticleProps>> = lazy(
  () => import('./IntegrationSettingsArticle'),
);
export const SyncTargetsDialog: LazyExoticComponent<ComponentType<SyncTargetsDialogProps>> = lazy(
  () => import('./SyncTargetsDialog'),
);
export const CustomTokenDialog: LazyExoticComponent<ComponentType<CustomTokenDialogProps>> = lazy(
  () => import('./CustomTokenDialog'),
);
