//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { EnableSkills, QuerySkills } from './definitions.ts';

export * as SkillManagerOperations from './definitions.ts';

export const SkillManagerHandlers = OperationHandlerSet.lazy([
  QuerySkills.pipe(Operation.lazyHandler(() => import('./query-skills.ts'))),
  EnableSkills.pipe(Operation.lazyHandler(() => import('./enable-skills.ts'))),
]);
