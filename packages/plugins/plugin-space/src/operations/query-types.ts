//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, JsonSchema, Query, Scope, Type, View } from '@dxos/echo';

import { SpaceOperation } from '#types';

// Machinery the agent addresses through its own surface rather than as data, so listing them only
// spends context.
// TODO(wittjosiah): Remove?
const EXCLUDED_TYPES = [Type.Type, View.View, Instructions.Instructions, Skill.Skill, Feed.Feed];
const excludedTypenames = EXCLUDED_TYPES.map((type) => Type.getTypename(type));

const handler: Operation.WithHandler<typeof SpaceOperation.QueryTypes> = SpaceOperation.QueryTypes.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ typenames, limit }) {
      const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run;
      const sorted = [...types]
        .filter((schema) => !excludedTypenames.includes(Type.getTypename(schema)))
        .sort((left, right) =>
          `${Type.getTypename(left)}:${Type.getVersion(left)}`.localeCompare(
            `${Type.getTypename(right)}:${Type.getVersion(right)}`,
          ),
        );
      const bounded = limit === undefined ? sorted : sorted.slice(0, limit);

      if (typenames && typenames.length > 0) {
        const requested = new Set(typenames);
        return {
          types: bounded
            .filter((schema) => requested.has(Type.getTypename(schema)))
            .map((schema) => ({
              typename: Type.getTypename(schema),
              version: Type.getVersion(schema),
              kind: Type.isRelation(schema) ? 'relation' : 'record',
              jsonSchema: JsonSchema.toJsonSchema(schema),
            })),
        };
      }

      return {
        types: bounded.map((schema) => {
          const jsonSchema = JsonSchema.toJsonSchema(schema);
          return {
            typename: Type.getTypename(schema),
            // Two versions of a typename can be registered at once, so a row that names only the
            // typename cannot identify the schema it describes.
            version: Type.getVersion(schema),
            kind: Type.isRelation(schema) ? 'relation' : 'record',
            name: jsonSchema.title ?? Type.getTypename(schema),
            description: jsonSchema.description,
            fields: Object.keys(jsonSchema.properties ?? {}),
          };
        }),
      };
    }),
  ),
);

export default handler;
