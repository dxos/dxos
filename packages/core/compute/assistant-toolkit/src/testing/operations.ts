//
// Copyright 2026 DXOS.org
//

import { AssistantTestLayerWithTriggers } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Instructions from '@dxos/compute/Instructions';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Collection, Feed, Tag } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Employer, Organization, Outline, Person, Task, TaskSet } from '@dxos/types';

import { AgentHandlers } from '../operations/index.ts';
import { AgentSkillHandlers } from '../skills/agent/operations/index.ts';
import { AlarmHandlers } from '../skills/alarm/operations/index.ts';
import { ChatContextHandlers } from '../skills/chat-context/operations/index.ts';
import { DelegationSkillHandlers } from '../skills/delegation/operations/index.ts';
import { MemoryHandlers } from '../skills/memory/operations/index.ts';
import { PlanningHandlers } from '../skills/planning/operations/index.ts';
import { SkillManagerHandlers } from '../skills/skill-manager/operations/index.ts';
import { Memory } from '../types/Memory.ts';

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
