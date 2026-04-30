//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { AddArtifact } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.agent';

/**
 * Creates the Agent blueprint. This is a function to avoid circular dependency issues.
 */
// TODO(dmaretskyi): Combine with Agent Wizard.
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Agent blueprint',
    instructions: Template.make({
      source: trim`
        You work on an agent. Each agent has instructions - the goal of the agent.
        The agent plan shows the current progress of the agent.
        Agent has a number of associated artifacts you can read/write.
        You can edit them if necessary.

        IMPORTANT: When creating a new artifact, always add it to the agent using the add-artifact function.

        {{#with agent}}
        <agent id="{{id}}" name="{{name}}">
          <instructions>
            {{instructions}}
          </instructions>
          <plan>
            {{plan}}
          </plan>

          <artifacts>
          {{#each artifacts}}
            <artifact type="{{type}}" dxn="{{dxn}}">
              {{name}}
            </artifact>
          {{/each}}
          </artifacts>
        </agent>
        {{/with}}
      `,
      inputs: [
        {
          name: 'agent',
          kind: 'function',
          function: 'org.dxos.function.agent.get-context',
        },
      ],
    }),
    tools: Blueprint.toolDefinitions({ operations: [AddArtifact] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
