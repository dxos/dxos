//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const JournalArticle: ComponentType<any> = lazy(() => import('./JournalArticle'));
export const OutlineCard: ComponentType<any> = lazy(() => import('./OutlineCard'));
export const OutlineArticle: ComponentType<any> = lazy(() => import('./OutlineArticle'));
export const QuickEntryDialog: ComponentType<any> = lazy(() => import('./QuickEntryDialog'));
