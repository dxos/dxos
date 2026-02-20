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
  key: 'dxos.org/function/assistant/context-add',
  name: 'Add to context',
  description: trim`
    Adds the object to the chat context.
    Use this it for objects that are useful long-term for the conversation.
  `,
  inputSchema: Schema.Struct({
    obj: Type.Ref(Type.Obj).annotations({
      description: 'Object to add to the chat context.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { obj } }) {
    const { binder } = yield* AiContextService;
    yield* Effect.promise(() =>
      binder.bind({
        blueprints: [],
        objects: [obj],
      }),
    );
  }, AiContextService.fixFunctionHandlerType),
});
