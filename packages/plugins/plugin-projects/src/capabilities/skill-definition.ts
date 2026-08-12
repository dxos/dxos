//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ProjectsSkillDefinition } from '../skills/projects-skill';

const skillDefinition = () =>
  Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, ProjectsSkillDefinition)]);

export default skillDefinition;
