//
// Copyright 2025 DXOS.org
//

import { Effect, Option, Schema, pipe } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';

// TODO(burdon): Common error handling.
// TODO(burdon): Factor out to space plugin.
export default defineFunction({
  key: 'dxos.org/function/assistant/load',
  name: 'Assistant load',
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
    // TODO(wittjosiah): Type.Obj.Any | Type.Relation.Any
    object: Schema.Any,
  }),
  handler: Effect.fn(function* ({ data: { id, typename } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
    return yield* pipe(
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
