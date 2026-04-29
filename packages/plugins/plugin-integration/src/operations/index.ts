//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create-integration'),
  () => import('./set-integration-targets'),
);

export * as IntegrationOperation from './definitions';
export { CreateIntegration, SetIntegrationTargets, AccessTokenCreated } from './definitions';
export const IntegrationHandlers = Handlers;
