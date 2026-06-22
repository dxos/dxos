//
// Copyright 2026 DXOS.org
//

import { type RoutineCapabilities } from '@dxos/plugin-routine';

import { dailyDigest } from './daily-digest';
import { researchBrief } from './research-brief';

/** Generic, subject-less automation templates contributed alongside plugin-routine's Blank. */
export const automationTemplates: RoutineCapabilities.Template[] = [researchBrief, dailyDigest];
