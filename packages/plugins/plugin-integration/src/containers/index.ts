//
// Copyright 2025 DXOS.org
//

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

import type { CustomTokenDialogProps } from './CustomTokenDialog';
import type { IntegrationArticleProps } from './IntegrationArticle';
import type { SyncTargetsChecklistProps } from './SyncTargetsChecklist';

export const IntegrationArticle: LazyExoticComponent<ComponentType<IntegrationArticleProps>> = lazy(
  () => import('./IntegrationArticle'),
);
export const SyncTargetsChecklist: LazyExoticComponent<ComponentType<SyncTargetsChecklistProps>> = lazy(
  () => import('./SyncTargetsChecklist'),
);
export const CustomTokenDialog: LazyExoticComponent<ComponentType<CustomTokenDialogProps>> = lazy(
  () => import('./CustomTokenDialog'),
);
