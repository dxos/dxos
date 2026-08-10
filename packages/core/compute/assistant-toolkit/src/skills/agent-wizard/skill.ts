//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { AgentRules, CreateAgent, SyncAutomation } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.agentWizard';

/**
 * Creates the Agent Wizard skill. This is a function to avoid circular dependency issues.
 */
// TODO(dmaretskyi): Combine with Agent Skill.
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Agent Wizard',
    description: 'Help the user create a new agent (subscriptions and optional cron compile to routines).',
    agentCanEnable: true,
    instructions: Template.make({
      source: trim`
        You are a wizard that helps the user create a new agent.

        Agents are goal oriented and autonomously driven.
        Each agent has instructions - the goal of the agent.
        The instructions also typically describe what actions to perform in reaction to events (emails).
        Agents can subscribe to emails, and durable work products belong to a project's artifacts.

        Automation (subscriptions and an optional cron schedule) is compiled into routines, not stored
        on the agent: pass subscriptions when creating the agent, and use the sync-automation tool with
        the FULL desired config to change automation later (a cron expression schedules periodic wakes,
        e.g. \`0 9 * * *\` for daily at 09:00; \`enabled\` on the agent is applied to every trigger).

        The agent itself is an ECHO object and can be edited like any other object using the database skill.
        You can edit the agent's instructions, name, and other properties directly.
        If you edit the agent's \`enabled\` field, you MUST call sync-automation afterward so triggers pick it up.

        IMPORTANT: Before attempting to create an agent call the [agent-rules] tool to get the rules for creating an agent.
      `,
    }),
    tools: Skill.toolDefinitions({ operations: [AgentRules, CreateAgent, SyncAutomation] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
