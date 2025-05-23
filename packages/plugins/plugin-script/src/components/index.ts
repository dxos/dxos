//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './Settings';
export * from './TestPanel';
export { DEPLOYMENT_DIALOG } from './DeploymentDialog';

export const ScriptContainer = lazy(() => import('./ScriptContainer'));
export const DeploymentDialog = lazy(() => import('./DeploymentDialog'));
