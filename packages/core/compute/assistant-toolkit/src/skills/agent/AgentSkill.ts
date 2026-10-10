//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

export const key = 'org.dxos.skill.agent';

/**
 * Creates the Agent skill. This is a function to avoid circular dependency issues.
 */
export const make = () =>
  Skill.make({
    key,
    name: 'Agent skill',
    instructions: Template.make({
      source: trim`
        You work on an agent. Each agent has instructions - the goal of the agent.
        The agent plan shows the current progress of the agent.

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
          operation: 'org.dxos.operation.assistantToolkit.getContext',
        },
      ],
    }),
  });

export { AgentSkillHandlers as Handlers } from './operations/index.ts';
export * as Operations from './operations/definitions.ts';
