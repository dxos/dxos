//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DiscordPanel: ComponentType<any> = lazy(() => import('./DiscordPanel'));
export const FeedbackPanel: ComponentType<any> = lazy(() => import('./FeedbackPanel'));
export const HelpMenu: ComponentType<any> = lazy(() => import('./HelpMenu'));
export const ShortcutsDialogContent: ComponentType<any> = lazy(() => import('./ShortcutsDialogContent'));
export const ShortcutsHints: ComponentType<any> = lazy(() => import('./ShortcutsHints'));
export const ShortcutsList: ComponentType<any> = lazy(() => import('./ShortcutsList'));
export const SpaceHomeWelcome: ComponentType<any> = lazy(() => import('./SpaceHomeWelcome'));
export const SupportArticle: ComponentType<any> = lazy(() => import('./SupportArticle'));
export const SupportCompanion: ComponentType<any> = lazy(() => import('./SupportCompanion'));
export const SupportSettings: ComponentType<any> = lazy(() => import('./SupportSettings'));
