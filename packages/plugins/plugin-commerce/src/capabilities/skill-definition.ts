//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ProviderSkill } from '../skills/index.ts';

const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, ProviderSkill)]);

export default skillDefinition;
