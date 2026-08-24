//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ProjectSkill } from '@dxos/assistant-toolkit';

// The skill is defined in assistant-toolkit, which sits below every consumer; this plugin owns the
// verbs it drives, so it is what contributes the skill to an app.
const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, ProjectSkill)]);

export default skillDefinition;
