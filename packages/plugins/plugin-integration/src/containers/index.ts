//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TokensContainer: ComponentType<any> = lazy(() => import('./TokensContainer'));
export const IntegrationArticle: ComponentType<any> = lazy(() => import('./IntegrationArticle'));
export const SyncTargetsChecklist: ComponentType<any> = lazy(() =>
  import('./SyncTargetsChecklist').then((m) => ({ default: m.SyncTargetsChecklist })),
);
