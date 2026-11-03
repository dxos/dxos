//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { CoderSkill, FeatureMapSkill, RepositoriesSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.contribute(AppCapabilities.SkillDefinition, CoderSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, FeatureMapSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, RepositoriesSkill),
  ]);

export default skillDefinition;
