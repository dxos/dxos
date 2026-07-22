//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ScriptSkill } from '#skills';

const skillDefinition = () => Effect.succeed([Capability.provide(AppCapabilities.SkillDefinition, ScriptSkill)]);

export default skillDefinition;
