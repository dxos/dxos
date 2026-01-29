import { agent, getContext, update } from './functions';

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
export const getFunctions = () => [getContext, update, agent];

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
        
        {{#with initiative}}
          Initiative spec:
            {{spec.dxn}}
            {{spec.content}}

          Initiative plan:
            {{plan.dxn}}
            {{plan.content}}

          All artifacts:
          {{#each artifacts}}
            {{name}}: {{type}} {{dxn}}
          {{/each}}
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
    tools: Blueprint.toolDefinitions({ functions: [update] }),
  });
