//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { AddArtifact, SyncTriggers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.project';

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

        IMPORTANT: When creating a new artifact, always add it to the project using the add-artifact function.

        The project itself is an ECHO object and can be edited like any other object using the database blueprint.
        You can edit the project's spec, name, and other properties directly.
        If you edit the project's subscriptions array, you MUST call the sync-triggers function afterward to synchronize the triggers.

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
          function: 'org.dxos.function.project.get-context',
        },
      ],
    }),
    tools: Blueprint.toolDefinitions({ operations: [AddArtifact, SyncTriggers] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
