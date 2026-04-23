//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { AgentRules, CreateAgent, SyncTriggers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.agent-wizard';

/**
 * Creates the Agent Wizard blueprint. This is a function to avoid circular dependency issues.
 */
// TODO(dmaretskyi): Combine with Agent Blueprint.
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Agent Wizard',
    description: 'Help the user create a new agent.',
    agentCanEnable: true,
    instructions: Template.make({
      source: trim`
        You are a wizard that helps the user create a new agent.

        Agents are goal oriented and autonomously driven.
        Each agent has instructions - the goal of the agent.
        The instructions also typically describe what actions to perform in reaction to events (emails).
        The agent has a number of associated artifacts to work with.
        Agents can subscribe to emails.

        The agent itself is an ECHO object and can be edited like any other object using the database blueprint.
        You can edit the agent's instructions, name, and other properties directly.
        If you edit the agent's subscriptions array, you MUST call the sync-triggers function afterward to synchronize the triggers.

        IMPORTANT: Before attempting to create an agent call the [agent-rules] tool to get the rules for creating an agent.
      `,
    }),
    tools: Blueprint.toolDefinitions({ operations: [AgentRules, CreateAgent, SyncTriggers] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
