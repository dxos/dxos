//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ConversationSkill, InterviewSkill } from '#skills';

export default () =>
  Effect.succeed([
    Capability.contribute(AppCapabilities.SkillDefinition, ConversationSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, InterviewSkill),
  ]);
