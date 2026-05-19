//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FeedbackPanel: ComponentType<any> = lazy(() => import('./FeedbackPanel'));
export const HelpMenu: ComponentType<any> = lazy(() => import('./HelpMenu'));
export const ShortcutsDialogContent: ComponentType<any> = lazy(() => import('./ShortcutsDialogContent'));
export const ShortcutsHints: ComponentType<any> = lazy(() => import('./ShortcutsHints'));
export const ShortcutsList: ComponentType<any> = lazy(() => import('./ShortcutsList'));
export const SupportArticle: ComponentType<any> = lazy(() => import('./SupportArticle'));
export const SupportCompanion: ComponentType<any> = lazy(() => import('./SupportCompanion'));
export const WelcomeArticle: ComponentType<any> = lazy(() => import('./WelcomeArticle'));
