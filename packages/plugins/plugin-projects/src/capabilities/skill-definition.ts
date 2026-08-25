//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ProjectSkill } from '#skills';

// The plugin owns both the skill and the verbs it drives, so the tool list is checked by the
// compiler rather than by a string match at resolution time.
const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, ProjectSkill)]);

export default skillDefinition;
