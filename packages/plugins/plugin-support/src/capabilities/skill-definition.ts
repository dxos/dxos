//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ComposerSkill, SupportSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.contributes(AppCapabilities.SkillDefinition, SupportSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, ComposerSkill),
  ]);

export default skillDefinition;
