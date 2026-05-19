//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const StatusBarActions: ComponentType<any> = lazy(() => import('./StatusBarActions'));
export const StatusBarPanel: ComponentType<any> = lazy(() => import('./StatusBarPanel'));
export const VersionNumber: ComponentType<any> = lazy(() => import('./VersionNumber'));
