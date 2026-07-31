//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { KanbanSkill } from '#skills';

const skillDefinition = () => Effect.succeed([Capability.contribute(AppCapabilities.SkillDefinition, KanbanSkill)]);

export default skillDefinition;
