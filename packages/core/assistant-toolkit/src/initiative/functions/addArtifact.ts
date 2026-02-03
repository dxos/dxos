//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import * as Initiative from '../Initiative';

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
  outputSchema: Schema.Void,
  services: [AiContextService],
  handler: Effect.fnUntraced(function* ({ data }) {
    if (!(yield* Database.Service.load(data.artifact))) {
      throw new Error('Artifact not found.');
    }

    const { binder } = yield* AiContextService;

    const initiative = binder
      .getObjects()
      .filter((_) => Obj.instanceOf(Initiative.Initiative, _))
      .at(0);
    if (!initiative) {
      throw new Error('No initiative in context.');
    }

    Obj.change(initiative, (initiative) => {
      initiative.artifacts.push({
        name: data.name,
        data: data.artifact,
      });
    });
  }) as any, // TODO(dmaretskyi): Services don't align -- need to refactor how functions are defined.
});
