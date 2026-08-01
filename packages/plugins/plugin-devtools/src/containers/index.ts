//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DebugGraph: ComponentType<any> = lazy(() => import('./DebugGraph'));
export const DevtoolsOverviewContainer: ComponentType<any> = lazy(() => import('./DevtoolsOverviewContainer'));
export const GithubPanel: ComponentType<any> = lazy(() => import('./GithubPanel'));
export const RegistryPanel: ComponentType<any> = lazy(() => import('./RegistryPanel'));
