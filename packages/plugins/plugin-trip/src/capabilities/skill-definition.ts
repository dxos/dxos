//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { TripSkill } from '../skills';

const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, TripSkill)]);

export default skillDefinition;
