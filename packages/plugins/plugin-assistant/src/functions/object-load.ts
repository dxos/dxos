//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Database } from '@dxos/echo';

// TODO(burdon): Move to toolkit (i.e., tool not function).
export default defineFunction({
  key: 'dxos.org/function/assistant/object-load',
  name: 'Load object',
  description: 'Loads the object.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
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
  handler: Effect.fn(function* ({ data: { id, typename } }) {
    const object = yield* Database.Service.resolve(ArtifactId.toDXN(id));
    return yield* Function.pipe(
      Option.fromNullable(object),
      Option.flatMap((object) => (Obj.getTypename(object) === typename ? Option.some(object) : Option.none())),
      Option.match({
        onNone: () => Effect.fail('Object not found.'),
        onSome: (object) => {
          // log.info('object', { object });
          return Effect.succeed({ object });
        },
      }),
    );
  }),
});
