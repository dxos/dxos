//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { EnableBlueprints, QueryBlueprints, UpdateBlueprints } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.blueprint-manager';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Blueprint Manager',
    description: 'Query and enable blueprints in the current conversation.',
    instructions: Template.make({
      source: trim`
        You can query available blueprints and enable them in the current conversation.
        Use [query-blueprints] to refresh the list of available blueprints.
        Use [refresh-blueprints] to update blueprint objects stored in the database from the built-in registry when they have drifted.
        Use [enable-blueprints] to enable blueprints by their keys. Always call [query-blueprints] first.
        Only blueprints with agentCanEnable=true can be enabled by the agent.

        <available_blueprints>
        {{#each blueprints}}
        - {{key}} "{{name}}"{{#if description}} -- {{description}}{{/if}}{{#if agentCanEnable}} [agent-can-enable]{{/if}}
        {{/each}}
        </available_blueprints>

        NOTE: You must enable the blueprint to use it, only then the tools from that blueprint will appear.
      `,
      inputs: [
        {
          name: 'blueprints',
          kind: 'function',
          function: QueryBlueprints.meta.key,
        },
      ],
    }),
    tools: Blueprint.toolDefinitions({ operations: [QueryBlueprints, EnableBlueprints, UpdateBlueprints] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
