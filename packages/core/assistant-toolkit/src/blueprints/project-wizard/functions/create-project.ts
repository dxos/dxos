//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Project } from '../../../types';

export default defineFunction({
  key: 'org.dxos.function.project-wizard.create-project',
  name: 'Create project',
  description: 'Creates a new project.',
  inputSchema: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the project to create.',
    }),
    spec: Schema.String.annotations({
      description: 'The goal of the project. Be specic but not to verbose. The agent will use this as a core objective and set of rules to follow.',
    }),
  }),
  services: [AiContextService],
  handler: Effect.fnUntraced(function* ({ data }) {
    if (!(yield* Database.load(data.artifact))) {
      throw new Error('Artifact not found.');
    }

    const project = yield* Project.getFromChatContext;

    Obj.change(project, (project) => {
      project.artifacts.push({
        name: data.name,
        data: data.artifact,
      });
    });
  }, AiContextService.fixFunctionHandlerType),
});
