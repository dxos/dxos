//
// Copyright 2026 DXOS.org
//

import { type AutomationCapabilities } from '@dxos/plugin-automation';

import { dailyDigest } from './daily-digest';
import { researchBrief } from './research-brief';

/** Generic, subject-less automation templates contributed alongside plugin-automation's Blank. */
export const automationTemplates: AutomationCapabilities.Template[] = [researchBrief, dailyDigest];
