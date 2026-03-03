//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextService } from '@dxos/assistant';
import { Type } from '@dxos/echo';
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
    obj: Type.Ref(Type.Obj).annotations({
      description: 'Object to remove from the chat context.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { obj } }) {
    const { binder } = yield* AiContextService;
    yield* Effect.promise(() =>
      binder.unbind({
        blueprints: [],
        objects: [obj],
      }),
    );
  }, AiContextService.fixFunctionHandlerType),
});
