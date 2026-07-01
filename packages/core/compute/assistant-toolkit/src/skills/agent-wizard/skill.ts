//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { AgentRules, CreateAgent, SyncTriggers } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.agentWizard';

/**
 * Creates the Agent Wizard skill. This is a function to avoid circular dependency issues.
 */
// TODO(dmaretskyi): Combine with Agent Skill.
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Agent Wizard',
    description: 'Help the user create a new agent (subscriptions, optional cron timer, sync-triggers after edits).',
    agentCanEnable: true,
    instructions: Template.make({
      source: trim`
        You are a wizard that helps the user create a new agent.

        Agents are goal oriented and autonomously driven.
        Each agent has instructions - the goal of the agent.
        The instructions also typically describe what actions to perform in reaction to events (emails).
        The agent has a number of associated artifacts to work with.
        Agents can subscribe to emails.

        Agents have a \`cron\` field: when set, the agent runs on a timer on that schedule (standard cron syntax).
        Use \`cron\` when the user wants the agent to run periodically (e.g. "every morning", "once a day", "every 5 minutes").
        Examples: \`0 9 * * *\` for daily at 09:00, or \`*/5 * * * *\` for every 5 minutes.
        Timer triggers bypass the qualifier and invoke the agent worker directly on the schedule.

        The agent itself is an ECHO object and can be edited like any other object using the database skill.
        You can edit the agent's instructions, name, and other properties directly.
        If you edit the agent's \`enabled\` field, \`filterEvents\` field, subscriptions array, or \`cron\` field, you MUST call the sync-triggers function afterward to synchronize the triggers (\`enabled\` is applied to all triggers).

        IMPORTANT: Before attempting to create an agent call the [agent-rules] tool to get the rules for creating an agent.
      `,
    }),
    tools: Skill.toolDefinitions({ operations: [AgentRules, CreateAgent, SyncTriggers] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
