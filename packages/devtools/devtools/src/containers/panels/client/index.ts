//
// Copyright 2020 DXOS.org
//

import { lazy } from 'react';

export const ConfigPanel = lazy(() => import('./ConfigPanel/index.ts'));
export const DiagnosticsPanel = lazy(() => import('./DiagnosticsPanel/index.ts'));
export const LoggingPanel = lazy(() => import('./LoggingPanel/index.ts'));
export const StoragePanel = lazy(() => import('./StoragePanel/index.ts'));
export const SqlitePanel = lazy(() => import('./SqlitePanel/index.ts'));
