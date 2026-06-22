//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { DoctorSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([Capability.opaque(Capability.contributes(AppCapabilities.SkillDefinition, DoctorSkill))]);

export default skillDefinition;
