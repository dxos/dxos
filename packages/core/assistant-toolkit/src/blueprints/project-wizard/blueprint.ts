//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ProjectRules, CreateProject, SyncTriggers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.project-wizard';

/**
 * Creates the Project blueprint. This is a function to avoid circular dependency issues.
 */
// TODO(dmaretskyi): Combine with Project Blueprint
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Project Wizard',
    description: 'Help the user create a new project.',
    agentCanEnable: true,
    instructions: Template.make({
      source: trim`
        You are a wizard that helps the user create a new project.

        Projects are goal oriented and autonomously driven by the agent.
        Each project has a spec - the goal of the project.
        The spec also typically describes what actions to perform in reaction to events (emails).
        The project has a number of associated artifacts to work with. 
        Projects can subscribe to emails.

        The project itself is an ECHO object and can be edited like any other object using the database blueprint.
        You can edit the project's spec, name, and other properties directly.
        If you edit the project's subscriptions array, you MUST call the sync-triggers function afterward to synchronize the triggers.

        IMPORTANT: Before attempting to create a project call the [project-rules] tool to get the rules for creating a project.
      `,
    }),
    tools: Blueprint.toolDefinitions({ operations: [ProjectRules, CreateProject, SyncTriggers] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
