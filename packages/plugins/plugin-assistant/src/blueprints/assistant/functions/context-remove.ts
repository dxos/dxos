//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService, ArtifactId } from '@dxos/assistant';
import { Database, type Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { trim } from '@dxos/util';

export default defineFunction({
  key: 'dxos.org/function/assistant/context-remove',
  name: 'Remove from context',
  description: trim`
    Removes the object from the chat context.
    Use this it for objects that are no longer useful for the conversation.
  `,
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'Object to remove from the chat context.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { id } }) {
    const { binder } = yield* AiContextService;
    const { db } = yield* Database.Service;
    const ref = db.makeRef(ArtifactId.toDXN(id, db.spaceId)) as Ref.Ref<any>;
    yield* Effect.promise(() =>
      binder.unbind({
        blueprints: [],
        objects: [ref],
      }),
    );
  }, AiContextService.fixFunctionHandlerType),
});
