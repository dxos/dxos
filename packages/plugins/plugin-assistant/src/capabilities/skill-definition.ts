//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import {
  AgentHandlers,
  AgentSkill,
  AgentSkillHandlers,
  AgentWizardHandlers,
  AgentWizardSkill,
  AlarmHandlers,
  AlarmSkill,
  AutomationSkill,
  BrowserSkill,
  ConnectorsSkill,
  DatabaseHandlers,
  DatabaseSkill,
  DelegationHandlers,
  DelegationSkill,
  DiscordSkill,
  LinearSkill,
  MemorySkill,
  PlanningHandlers,
  PlanningSkill,
  ProjectHandlers,
  ProjectSkill,
  SkillManagerHandlers,
  SkillManagerSkill,
  WebSearchHandlers,
  WebSearchSkill,
  makeDelegationStrategy,
} from '@dxos/assistant-toolkit';
import { RoutineCapabilities } from '@dxos/plugin-routine';

import { AssistantSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.contributeAll(AppCapabilities.SkillDefinition, [
      AssistantSkill,
      BrowserSkill,
      ConnectorsSkill,
      DatabaseSkill,
      WebSearchSkill,
      DiscordSkill,
      LinearSkill,
      AgentSkill,
      PlanningSkill,
      MemorySkill,
      AutomationSkill,
      SkillManagerSkill,
      AgentWizardSkill,
      DelegationSkill,
      AlarmSkill,
      ProjectSkill,
    ]),

    Capability.contributeAll(Capabilities.OperationHandler, [
      AgentHandlers,
      AgentSkillHandlers,
      SkillManagerHandlers,
      DatabaseHandlers,
      WebSearchHandlers,
      AgentWizardHandlers,
      DelegationHandlers,
      PlanningHandlers,
      AlarmHandlers,
      ProjectHandlers,
    ]),

    // Run the conversational agent as a supervisor: delegate in-progress plan tasks to sub-agents
    // and fold their results back into the conversation (consumed by the AgentService LayerSpec).
    Capability.contribute(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
  ]);

export default skillDefinition;
