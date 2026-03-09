//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ShortcutsDialogContent: ComponentType<any> = lazy(() => import('./ShortcutsDialogContent'));
export const ShortcutsHints: ComponentType<any> = lazy(() => import('./ShortcutsHints'));
export const ShortcutsList: ComponentType<any> = lazy(() => import('./ShortcutsList'));
