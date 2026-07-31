//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { BrainSkill } from '#skills';

const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, BrainSkill)]);

export default skillDefinition;
