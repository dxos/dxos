//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Database, Entity, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default defineFunction({
  key: 'dxos.org/function/assistant/object-load',
  name: 'Load object',
  description: 'Loads the object.',
  inputSchema: Schema.Struct({
    object: Type.Ref(Type.Obj).annotations({
      description: 'The ID of the object.',
    }),
    typename: Schema.String.annotations({
      description: 'The typename of the object.',
    }),
  }),
  outputSchema: Schema.Struct({
    // TODO(wittjosiah): Type.Entity.Any
    object: Schema.Any,
  }),
  handler: Effect.fn(function* ({ data: { object, typename } }) {
    const loadedObject = yield* Database.load(object);
    return yield* Function.pipe(
      Option.fromNullable(loadedObject),
      Option.flatMap((obj) => (Entity.getTypename(obj) === typename ? Option.some(obj) : Option.none())),
      Option.match({
        onNone: () => Effect.fail('Object not found.'),
        onSome: (obj) => {
          // log.info('object', { object: obj });
          return Effect.succeed({ object: obj });
        },
      }),
    );
  }),
});
