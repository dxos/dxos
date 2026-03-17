//
// Copyright 2026 DXOS.org
//

import { Prompt, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

export const processEvent = Prompt.make({
  key: 'dxos.org/prompt/project/process-event',
  name: 'Process event',
  description: 'Process an event for the project.',
  instructions: Template.make({
    source: trim`
        You work on an project.
        Each project has a spec - the goal of the project.
        Project has an number of associated artifacts you can read/write.

        IMPORTANT NOTES:
         - When create a new artifact, always add it to the project using the add-artifact function.
         - You are processing an event in the background. User is not monitoring the chat thread.
         - Do not ask questions.
         - Provide brief responses only.
         - Focus on updating/creating artifacts based on the event.

        {{#with project}}
        <project id="{{id}}" name="{{name}}">
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
        </project>
        {{/with}}
    `,
    inputs: [
      {
        name: 'project',
        kind: 'function',
        function: 'dxos.org/function/project/get-context',
      },
    ],
  }),
});
