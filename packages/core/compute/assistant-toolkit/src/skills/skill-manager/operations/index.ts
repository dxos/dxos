//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { EnableSkills, QuerySkills } from './definitions';

export * as SkillManagerOperations from './definitions';

export const SkillManagerHandlers = OperationHandlerSet.lazy([
  QuerySkills.pipe(Operation.lazyHandler(() => import('./query-skills'))),
  EnableSkills.pipe(Operation.lazyHandler(() => import('./enable-skills'))),
]);
