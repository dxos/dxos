//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AutomationArticle: ComponentType<any> = lazy(() => import('./AutomationArticle'));
export const AutomationSettings: ComponentType<any> = lazy(() => import('./AutomationSettings'));
export const AutomationsCompanion: ComponentType<any> = lazy(() => import('./AutomationsCompanion'));
export const TriggerSettings: ComponentType<any> = lazy(() => import('./TriggerSettings'));
