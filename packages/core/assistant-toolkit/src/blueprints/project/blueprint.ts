//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { ProjectFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/project';

const functions = [ProjectFunctions.AddArtifact];

/**
 * Creates the Project blueprint. This is a function to avoid circular dependency issues.
 */
const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Project blueprint',
    instructions: Template.make({
      source: trim`
        You work on an project. Each project has a spec - the goal of the project.
        The project plan shows the current progress of the project.
        Project has an number of associated artifacts you can read/write.
        Spec and plan are also artifacts.
        You can edit them if necessary.

        IMPORTANT: When create a new artifact, always add it to the project using the add-artifact function.

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
    tools: Blueprint.toolDefinitions({ functions }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
