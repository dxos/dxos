import { addArtifact, agent, getContext } from './functions';

import { AiContextBinder, type ContextBinding } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj, Ref, Relation, Type } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Text } from '@dxos/schema';
import type { Message } from '@dxos/types';
import { trim } from '@dxos/util';

/**
 * Get all initiative functions. This is a function to avoid circular dependency issues.
 */
export const getFunctions = () => [getContext, addArtifact, agent];

/**
 * Creates the Initiative blueprint. This is a function to avoid circular dependency issues.
 */
export const makeBlueprint = () =>
  Blueprint.make({
    key: 'dxos.org/blueprint/initiative',
    name: 'Initiative blueprint',
    instructions: Template.make({
      source: trim`
        You work on an initiative. Each initiative has a spec - the goal of the initiative.
        The initiative plan shows the current progress of the initiative.
        Initiative has an number of associated artifacts you can read/write.
        Spec and plan are also artifacts.
        You can edit them if necessary.

        IMPORTANT: When create a new artifact, always add it to the initiative using the add-artifact function.
        
        {{#with initiative}}
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
        {{/with}}
      `,
      inputs: [
        {
          name: 'initiative',
          kind: 'function',
          function: 'dxos.org/function/initiative/get-context',
        },
      ],
    }),
    tools: Blueprint.toolDefinitions({ functions: [addArtifact] }),
  });
