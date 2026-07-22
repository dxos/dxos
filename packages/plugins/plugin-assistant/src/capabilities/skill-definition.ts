//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
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
    Capability.contribute(AppCapabilities.SkillDefinition, AssistantSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, BrowserSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, ConnectorsSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, DatabaseSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, WebSearchSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, DiscordSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, LinearSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, AgentSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, PlanningSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, MemorySkill),
    Capability.contribute(AppCapabilities.SkillDefinition, AutomationSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, SkillManagerSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, AgentWizardSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, DelegationSkill),
    Capability.contribute(AppCapabilities.SkillDefinition, AlarmSkill),

    Capability.contribute(Capabilities.OperationHandler, AgentHandlers),
    Capability.contribute(Capabilities.OperationHandler, AgentSkillHandlers),
    Capability.contribute(Capabilities.OperationHandler, SkillManagerHandlers),
    Capability.contribute(Capabilities.OperationHandler, DatabaseHandlers),
    Capability.contribute(Capabilities.OperationHandler, WebSearchHandlers),
    Capability.contribute(Capabilities.OperationHandler, AgentWizardHandlers),
    Capability.contribute(Capabilities.OperationHandler, DelegationHandlers),
    Capability.contribute(Capabilities.OperationHandler, PlanningHandlers),
    Capability.contribute(Capabilities.OperationHandler, AlarmHandlers),

    // Run the conversational agent as a supervisor: delegate in-progress plan tasks to sub-agents
    // and fold their results back into the conversation (consumed by the AgentService LayerSpec).
    Capability.contribute(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
  ]);

export default skillDefinition;
