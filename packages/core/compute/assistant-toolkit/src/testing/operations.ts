//
// Copyright 2026 DXOS.org
//

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Instructions from '@dxos/compute/Instructions';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Feed, Tag } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Employer, Organization, Outline, Person, Task, TaskSet } from '@dxos/types';

import { AgentHandlers } from '../operations';
import { AgentSkillHandlers } from '../skills/agent/operations';
import { AlarmHandlers } from '../skills/alarm/operations';
import { ChatContextHandlers } from '../skills/chat-context/operations';
import { DelegationSkillHandlers } from '../skills/delegation/operations';
import { MemoryHandlers } from '../skills/memory/operations';
import { PlanningHandlers } from '../skills/planning/operations';
import { SkillManagerHandlers } from '../skills/skill-manager/operations';
import { Agent, Chat } from '../types';
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
    AlarmHandlers,
    ChatContextHandlers,
    DelegationSkillHandlers,
    MemoryHandlers,
    PlanningHandlers,
    SkillManagerHandlers,
  ),
  types: [
    Agent.Agent,
    AiContext.Binding,
    Chat.Chat,
    Collection.Collection,
    Employer.Employer,
    Feed.Feed,
    Instructions.Instructions,
    Memory,
    Organization.Organization,
    Person.Person,
    Outline.Outline,
    Routine.Routine,
    Task.Task,
    TaskSet.TaskSet,
    Skill.Skill,
    SpaceProperties,
    Tag.Tag,
    Text.Text,
    Trigger.Trigger,
  ],
  disableLlmMemoization: true,
});
