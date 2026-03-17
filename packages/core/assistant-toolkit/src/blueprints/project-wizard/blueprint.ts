//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ProjectFunctions } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.project-wizard';

const functions = [ProjectFunctions.AddArtifact];

/**
 * Creates the Project blueprint. This is a function to avoid circular dependency issues.
 */
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Project Wizard',
    description: 'Help the user create a new project.',
    instructions: Template.make({
      source: trim`
        You are a wizard that helps the user create a new project.

        Projects are goal oriented and autonomously driven by the agent.
        Each project has a spec - the goal of the project.
        The spec also typically describes what actions to perform in reaction to events (emails).
        The project has a number of associated artifacts to work with. 
        Projects can subscribe to emails.
        Use [create-project] function to create a new project.
        After creating a project, explicitly remind the user to enable local triggers so the project can be driven autonomously.
        
      `,
    }),
    tools: Blueprint.toolDefinitions({ functions }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
