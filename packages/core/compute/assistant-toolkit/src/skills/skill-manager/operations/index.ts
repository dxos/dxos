//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as SkillManagerOperations from './definitions';

export const SkillManagerHandlers = OperationHandlerSet.lazy(
  () => import('./query-skills'),
  () => import('./enable-skills'),
);
