//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ProjectRules, CreateProject, ProjectWizardHandlers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.project-wizard';

/**
 * Creates the Project blueprint. This is a function to avoid circular dependency issues.
 */
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

        IMPORTANT: Before attempting to create a project call the [project-rules] tool to get the rules for creating a project.
      `,
    }),
    tools: Blueprint.toolDefinitions({ operations: [ProjectRules, CreateProject] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: ProjectWizardHandlers,
  make,
};

export default blueprint;
