//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

export * as SkillManagerOperations from './definitions';

export const SkillManagerHandlers = OperationHandlerSet.lazy(
  () => import('./query-skills'),
  () => import('./enable-skills'),
);
