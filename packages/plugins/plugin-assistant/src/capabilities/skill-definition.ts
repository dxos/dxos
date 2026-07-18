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
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet, Skill } from '@dxos/compute';
import { RoutineCapabilities } from '@dxos/plugin-routine';

import { AssistantSkill } from '#skills';

const skillDefinition = () =>
  Effect.succeed([
    Capability.provide(AppCapabilities.SkillDefinition, AssistantSkill),
    Capability.provide(AppCapabilities.SkillDefinition, BrowserSkill),
    Capability.provide(AppCapabilities.SkillDefinition, ConnectorsSkill),
    Capability.provide(AppCapabilities.SkillDefinition, DatabaseSkill),
    Capability.provide(AppCapabilities.SkillDefinition, WebSearchSkill),
    Capability.provide(AppCapabilities.SkillDefinition, DiscordSkill),
    Capability.provide(AppCapabilities.SkillDefinition, LinearSkill),
    Capability.provide(AppCapabilities.SkillDefinition, AgentSkill),
    Capability.provide(AppCapabilities.SkillDefinition, PlanningSkill),
    Capability.provide(AppCapabilities.SkillDefinition, MemorySkill),
    Capability.provide(AppCapabilities.SkillDefinition, AutomationSkill),
    Capability.provide(AppCapabilities.SkillDefinition, SkillManagerSkill),
    Capability.provide(AppCapabilities.SkillDefinition, AgentWizardSkill),
    Capability.provide(AppCapabilities.SkillDefinition, DelegationSkill),
    Capability.provide(AppCapabilities.SkillDefinition, AlarmSkill),

    Capability.provide(Capabilities.OperationHandler, AgentHandlers),
    Capability.provide(Capabilities.OperationHandler, AgentSkillHandlers),
    Capability.provide(Capabilities.OperationHandler, SkillManagerHandlers),
    Capability.provide(Capabilities.OperationHandler, DatabaseHandlers),
    Capability.provide(Capabilities.OperationHandler, WebSearchHandlers),
    Capability.provide(Capabilities.OperationHandler, AgentWizardHandlers),
    Capability.provide(Capabilities.OperationHandler, DelegationHandlers),
    Capability.provide(Capabilities.OperationHandler, PlanningHandlers),
    Capability.provide(Capabilities.OperationHandler, AlarmHandlers),

    // Run the conversational agent as a supervisor: delegate in-progress plan tasks to sub-agents
    // and fold their results back into the conversation (consumed by the AgentService LayerSpec).
    Capability.provide(RoutineCapabilities.AgentDelegationStrategy, makeDelegationStrategy()),
  ]);

export default skillDefinition;
