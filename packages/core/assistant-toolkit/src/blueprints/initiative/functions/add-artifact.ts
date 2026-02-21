//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Initiative } from '../../../types';

export default defineFunction({
  key: 'dxos.org/function/initiative/add-artifact',
  name: 'Add artifact',
  description: 'Adds a new artifact.',
  inputSchema: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the artifact to add.',
    }),
    artifact: Type.Ref(Type.Obj).annotations({
      description: 'The artifact to add. Do NOT guess or try to generate the ID.',
    }),
  }),
  services: [AiContextService],
  handler: Effect.fnUntraced(function* ({ data }) {
    if (!(yield* Database.load(data.artifact))) {
      throw new Error('Artifact not found.');
    }

    const initiative = yield* Initiative.getFromChatContext;

    Obj.change(initiative, (initiative) => {
      initiative.artifacts.push({
        name: data.name,
        data: data.artifact,
      });
    });
  }, AiContextService.fixFunctionHandlerType),
});
