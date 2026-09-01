//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DiscordPanel: ComponentType<any> = lazy(() => import('./DiscordPanel/index.ts'));
export const FeedbackPanel: ComponentType<any> = lazy(() => import('./FeedbackPanel/index.ts'));
export const HelpMenu: ComponentType<any> = lazy(() => import('./HelpMenu/index.ts'));
export const ShortcutsDialogContent: ComponentType<any> = lazy(() => import('./ShortcutsDialogContent/index.ts'));
export const ShortcutsHints: ComponentType<any> = lazy(() => import('./ShortcutsHints/index.ts'));
export const ShortcutsList: ComponentType<any> = lazy(() => import('./ShortcutsList/index.ts'));
export const SpaceHomeWelcome: ComponentType<any> = lazy(() => import('./SpaceHomeWelcome/index.ts'));
export const SupportArticle: ComponentType<any> = lazy(() => import('./SupportArticle/index.ts'));
export const SupportCompanion: ComponentType<any> = lazy(() => import('./SupportCompanion/index.ts'));
export const SupportSettings: ComponentType<any> = lazy(() => import('./SupportSettings/index.ts'));
