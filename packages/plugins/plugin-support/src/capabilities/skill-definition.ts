//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ComposerSkill, SupportSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([Capability.contributeAll(AppCapabilities.SkillDefinition, [SupportSkill, ComposerSkill])]);

export default skillDefinition;
