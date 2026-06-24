//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { AddArtifact } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.agent';

/**
 * Creates the Agent skill. This is a function to avoid circular dependency issues.
 */
// TODO(dmaretskyi): Combine with Agent Wizard.
const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Agent skill',
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
          kind: 'operation',
          operation: 'org.dxos.function.agent.getContext',
        },
      ],
    }),
    tools: Skill.toolDefinitions({ operations: [AddArtifact] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
