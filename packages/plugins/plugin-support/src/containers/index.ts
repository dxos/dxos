//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FeedbackPanel: ComponentType<any> = lazy(() => import('./FeedbackPanel'));
export const ShortcutsDialogContent: ComponentType<any> = lazy(() => import('./ShortcutsDialogContent'));
export const ShortcutsHints: ComponentType<any> = lazy(() => import('./ShortcutsHints'));
export const ShortcutsList: ComponentType<any> = lazy(() => import('./ShortcutsList'));
export const SupportArticle: ComponentType<any> = lazy(() => import('./SupportArticle'));
export const SupportCompanionPanel: ComponentType<any> = lazy(() => import('./SupportCompanionPanel'));
export const WelcomeArticle: ComponentType<any> = lazy(() => import('./WelcomeArticle'));
