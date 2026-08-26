//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import {
  AgentSkill,
  AgentWizardSkill,
  AlarmSkill,
  AutomationSkill,
  BrowserSkill,
  ChatContextSkill,
  DelegationSkill,
  MemorySkill,
  PlanningSkill,
  SkillManagerSkill,
  WebSearchSkill,
  makeDelegationStrategy,
} from '@dxos/assistant-toolkit';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';

import { AssistantSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.contributeAll(AppCapabilities.SkillDefinition, [
      AssistantSkill,
      BrowserSkill,
      DatabaseSkill,
      ChatContextSkill,
      WebSearchSkill,
      AgentSkill,
      PlanningSkill,
      MemorySkill,
      AutomationSkill,
      SkillManagerSkill,
      AgentWizardSkill,
      DelegationSkill,
      AlarmSkill,
    ]),

    // Run the conversational agent as a supervisor: delegate in-progress plan tasks to sub-agents
    // and fold their results back into the conversation (consumed by the AgentService LayerSpec).
    Capability.contribute(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
  ]);

export default skillDefinition;
