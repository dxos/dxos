//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { DrawingSkill, UmlSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([Capability.contributeAll(AppCapabilities.SkillDefinition, [DrawingSkill, UmlSkill])]);

export default skillDefinition;
