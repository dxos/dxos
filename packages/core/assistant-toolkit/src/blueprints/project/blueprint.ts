//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ProjectFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/project';

const functions = [ProjectFunctions.AddArtifact];

/**
 * Creates the Project blueprint. This is a function to avoid circular dependency issues.
 */
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Project blueprint',
    instructions: Template.make({
      source: trim`
        Projects are a way to organize agent chats and work.
        Project have a spec - the goal of the project.
        Typically projects have specific topic associated with it, such as a research project, a design project, a development project, etc.
        Project have a number of associated artifacts agent can read/write.
        Projects can be subscribed to feeds, so the agent can automatically process events from the feeds.
        One example is subscribing to an email inbox, so the agent can automatically process emails.
        Project has a reference to a chat, that the agent runs in.
        Project has an input queue, that the agent processes events from.
        Project has a list of subscriptions, and then the triggers get created from those.
        [sync-triggers] function is to re-create triggers based on the subscriptions in the project object.
        
        When reacting to user request in context of a project, call [get-context] function to get the context of the project.
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
