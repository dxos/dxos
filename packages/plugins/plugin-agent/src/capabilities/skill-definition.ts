//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Hook from '@dxos/compute/Hook';

import {
  BrainSkill,
  ConversationSkill,
  EmailSkill,
  GoalsSkill,
  InterviewSkill,
  ModesSkill,
  NoteTakerSkill,
  RelaySkill,
  SupportSkill,
} from '#skills';

import { AgentNamespace } from '../namespace.ts';

export default () =>
  Effect.succeed([
    Capability.contribute(AppCapabilities.SkillDefinition, ConversationSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, InterviewSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, RelaySkill),
    Capability.contribute(AppCapabilities.SkillDefinition, GoalsSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, BrainSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, ModesSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, NoteTakerSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, SupportSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, EmailSkill),
    Capability.contributeAll(AppCapabilities.HookDefinition, Hook.forPlugin(AgentNamespace.key, BrainSkill.hooks)),
  ]);
