//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { InitiativeFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/initiative';

const functions = Object.values(InitiativeFunctions);

/**
 * Creates the Initiative blueprint. This is a function to avoid circular dependency issues.
 */
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
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
        <initiative id="{{id}}" name="{{name}}">
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
        </initiative>
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
    tools: Blueprint.toolDefinitions({ functions }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
