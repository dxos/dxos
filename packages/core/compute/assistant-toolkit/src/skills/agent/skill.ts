//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

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
        Durable work products belong to the agent's project: when you create an object the agent
        should keep, file it into the project's artifacts (the add-artifact tool of the Project
        skill) rather than leaving it loose in the space.

        {{#with agent}}
        <agent id="{{id}}" name="{{name}}">
          <instructions>
            {{instructions}}
          </instructions>
          <plan>
            {{plan}}
          </plan>
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
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
