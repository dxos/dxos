//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CliPanel: ComponentType<any> = lazy(() => import('./CliPanel/index.ts'));
export const DebugGraph: ComponentType<any> = lazy(() => import('./DebugGraph/index.ts'));
export const DevtoolsOverviewContainer: ComponentType<any> = lazy(() => import('./DevtoolsOverviewContainer/index.ts'));
export const GithubPanel: ComponentType<any> = lazy(() => import('./GithubPanel/index.ts'));
export const RegistryPanel: ComponentType<any> = lazy(() => import('./RegistryPanel/index.ts'));
export const ToolsExplorerContainer: ComponentType<any> = lazy(() => import('./ToolsExplorerContainer/index.ts'));
