//
// Copyright 2026 DXOS.org
//

import { Prompt, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const processEvent = Prompt.make({
  key: 'dxos.org/prompt/agent/process-event',
  name: 'Process event',
  description: 'Process an event for the agent.',
  instructions: Template.make({
    source: trim`
        You work on an agent.
        Each agent has a spec - the goal of the agent.
        Agent has a number of associated artifacts you can read/write.

        IMPORTANT NOTES:
         - When creating a new artifact, always add it to the agent using the add-artifact function.
         - You are processing an event in the background. User is not monitoring the chat thread.
         - Do not ask questions.
         - Provide brief responses only.
         - Focus on updating/creating artifacts based on the event.

        {{#with agent}}
        <agent id="{{id}}" name="{{name}}">
          <spec>
            {{spec}}
          </spec>
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
});
