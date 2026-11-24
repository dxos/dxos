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

const NOT_FOUND_HINT =
  'Not registered where this ran: a type another plugin contributes may still exist. ' +
  "Look it up with the Skill Manager's queryTypes, which searches every registered type.";

const handler: Operation.WithHandler<typeof SpaceOperation.QueryTypes> = SpaceOperation.QueryTypes.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ typenames, limit }) {
      const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run;
      const requested = typenames && typenames.length > 0 ? new Set(typenames) : undefined;
      const sorted = [...types]
        .filter((schema) => !excludedTypenames.includes(Type.getTypename(schema)))
        .filter((schema) => requested === undefined || requested.has(Type.getTypename(schema)))
        .sort((left, right) =>
          `${Type.getTypename(left)}:${Type.getVersion(left)}`.localeCompare(
            `${Type.getTypename(right)}:${Type.getVersion(right)}`,
          ),
        );
      const bounded = limit === undefined ? sorted : sorted.slice(0, limit);

      if (requested) {
        // An empty answer reads as "no such type"; on a host that runs this apart from other plugins (an EDGE plugin
        // bundle) the type may well exist, so say which were not found and where to look.
        const found = new Set(sorted.map((schema) => Type.getTypename(schema)));
        const notFound = [...requested].filter((typename) => !found.has(typename));
        return {
          types: bounded.map((schema) => ({
            typename: Type.getTypename(schema),
            version: Type.getVersion(schema),
            kind: Type.isRelation(schema) ? 'relation' : 'record',
            jsonSchema: JsonSchema.toJsonSchema(schema),
          })),
          ...(notFound.length > 0 ? { notFound, hint: NOT_FOUND_HINT } : {}),
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
