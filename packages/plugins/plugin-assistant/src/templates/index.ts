//
// Copyright 2026 DXOS.org
//

import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { dailyDigest } from './daily-digest.ts';
import { researchBrief } from './research-brief.ts';

/** Generic, subject-less routine templates contributed alongside plugin-routine's Blank. */
export const routineTemplates: RoutineCapabilities.Template[] = [researchBrief, dailyDigest];
