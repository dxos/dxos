//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const StatusBarActions: ComponentType<any> = lazy(() => import('./StatusBarActions/index.ts'));
export const StatusBarPanel: ComponentType<any> = lazy(() => import('./StatusBarPanel/index.ts'));
export const VersionNumber: ComponentType<any> = lazy(() => import('./VersionNumber/index.ts'));
