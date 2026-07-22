//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { CoderSkill } from '#skills';

const skillDefinition = () => Effect.succeed([Capability.provide(AppCapabilities.SkillDefinition, CoderSkill)]);

export default skillDefinition;
