//
// Copyright 2026 DXOS.org
//

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { SpaceProperties } from '@dxos/client-protocol';
import { Instructions, OperationHandlerSet, Routine, Skill, Trigger } from '@dxos/compute';
import { Collection, Feed, Tag } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Employer, Organization, Person } from '@dxos/types';

import { AgentHandlers } from '../operations';
import { AgentWizardHandlers } from '../skills/agent-wizard/operations';
import { AgentSkillHandlers } from '../skills/agent/operations';
import { AlarmHandlers } from '../skills/alarm/operations';
import { DatabaseHandlers } from '../skills/database/operations';
import { DelegationHandlers } from '../skills/delegation/operations';
import { MemoryHandlers } from '../skills/memory/operations';
import { PlanningHandlers } from '../skills/planning/operations';
import { SkillManagerHandlers } from '../skills/skill-manager/operations';
import { Agent, Chat, Plan } from '../types';
import { Memory } from '../types/Memory';

/**
 * Shared layer for operation tests: every handler in the package plus the types those handlers
 * touch, with no language model. Defined once so a `.test.ts` per handler does not restate it —
 * handler sets are lazy, so registering all of them costs nothing until one is invoked.
 */
export const OperationTestLayer = AssistantTestLayerWithTriggers({
  operationHandlers: OperationHandlerSet.merge(
    AgentHandlers,
    AgentSkillHandlers,
    AgentWizardHandlers,
    AlarmHandlers,
    DatabaseHandlers,
    DelegationHandlers,
    MemoryHandlers,
    PlanningHandlers,
    SkillManagerHandlers,
  ),
  types: [
    Agent.Agent,
    AiContext.Binding,
    Chat.Chat,
    Chat.CompanionTo,
    Collection.Collection,
    Employer.Employer,
    Feed.Feed,
    Instructions.Instructions,
    Memory,
    Organization.Organization,
    Person.Person,
    Plan.Plan,
    Routine.Routine,
    Skill.Skill,
    SpaceProperties,
    Tag.Tag,
    Text.Text,
    Trigger.Trigger,
  ],
  disableLlmMemoization: true,
});
