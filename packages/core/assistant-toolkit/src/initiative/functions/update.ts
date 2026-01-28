//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Database, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Text } from '@dxos/schema';
import * as Initiative from '../Initiative';

export default defineFunction({
  key: 'dxos.org/function/initiative/update',
  name: 'Create or update artifact',
  description: 'Updates the text artifact to have new content.',
  inputSchema: Schema.Struct({
    name: Schema.String.annotations({
      description: 'The name of the artifact to update.',
    }),
    content: Schema.String.annotations({
      description: 'The new content of the artifact.',
    }),
    create: Schema.optional(Schema.Boolean).annotations({
      description: 'Whether to create the artifact if it does not exist.',
    }),
  }),
  outputSchema: Schema.Void,
  services: [AiContextService],
  handler: Effect.fnUntraced(function* ({ data }) {
    const { binder } = yield* AiContextService;

    const initiative = binder
      .getObjects()
      .filter((_) => Obj.instanceOf(Initiative.Initiative, _))
      .at(0);
    if (!initiative) {
      throw new Error('No initiative in context.');
    }

    const artifact = initiative.artifacts.find((artifact) => artifact.name === data.name);
    if (!artifact) {
      if (data.create) {
        Obj.change(initiative, (initiative) => {
          initiative.artifacts.push({
            name: data.name,
            data: Ref.make(Text.make(data.content)),
          });
        });
        return;
      } else {
        throw new Error(`Artifact ${data.name} not found.`);
      }
    }

    const artifactObj = yield* Database.Service.resolve(artifact.data, Text.Text);
    Obj.change(artifactObj, (artifactObj) => {
      artifactObj.content = data.content;
    });
  }) as any, // TODO(dmaretskyi): Services don't align -- need to refactor how functions are defined.
});
