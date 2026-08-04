//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { EnableSkills, QuerySkills } from './definitions';

export * as SkillManagerOperations from './definitions';

export const SkillManagerHandlers = OperationHandlerSet.keyed([
  [QuerySkills, () => import('./query-skills')],
  [EnableSkills, () => import('./enable-skills')],
]);
