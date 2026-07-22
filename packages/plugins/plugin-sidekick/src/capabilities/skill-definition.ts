//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { SidekickSkill } from '#skills';

const skillDefinition = () => Effect.succeed([Capability.provide(AppCapabilities.SkillDefinition, SidekickSkill)]);

export default skillDefinition;
