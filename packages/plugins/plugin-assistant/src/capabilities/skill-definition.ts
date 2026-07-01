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
    Capability.contributes(AppCapabilities.SkillDefinition, AssistantSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, BrowserSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, ConnectorsSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, DatabaseSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, WebSearchSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, DiscordSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, LinearSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, AgentSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, PlanningSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, MemorySkill),
    Capability.contributes(AppCapabilities.SkillDefinition, AutomationSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, SkillManagerSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, AgentWizardSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, DelegationSkill),
    Capability.contributes(AppCapabilities.SkillDefinition, AlarmSkill),

    Capability.contributes(Capabilities.OperationHandler, AgentHandlers),
    Capability.contributes(Capabilities.OperationHandler, AgentSkillHandlers),
    Capability.contributes(Capabilities.OperationHandler, SkillManagerHandlers),
    Capability.contributes(Capabilities.OperationHandler, DatabaseHandlers),
    Capability.contributes(Capabilities.OperationHandler, WebSearchHandlers),
    Capability.contributes(Capabilities.OperationHandler, AgentWizardHandlers),
    Capability.contributes(Capabilities.OperationHandler, DelegationHandlers),
    Capability.contributes(Capabilities.OperationHandler, PlanningHandlers),
    Capability.contributes(Capabilities.OperationHandler, AlarmHandlers),

    // Run the conversational agent as a supervisor: delegate in-progress plan tasks to sub-agents
    // and fold their results back into the conversation (consumed by the AgentService LayerSpec).
    Capability.contributes(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
  ]);

export default skillDefinition;
