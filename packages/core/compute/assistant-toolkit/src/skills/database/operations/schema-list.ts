//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Routine, Skill, Operation } from '@dxos/compute';
import { Database, Feed, Filter, JsonSchema, Query, Scope, Type, View } from '@dxos/echo';

import { SchemaList } from './definitions';

// TODO(dmaretskyi): This is a balance between not filling the agent's context with too many types and not excluding important types.
const EXCLUDED_TYPES = [Type.Type, View.View, Routine.Routine, Skill.Skill, Feed.Feed];
const excludedTypenames = EXCLUDED_TYPES.map((type) => Type.getTypename(type));

export default SchemaList.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run;
      return [...types]
        .filter((schema) => !excludedTypenames.includes(Type.getTypename(schema)))
        .sort((a, b) => {
          const aKey = `${Type.getTypename(a)}:${Type.getVersion(a)}`;
          const bKey = `${Type.getTypename(b)}:${Type.getVersion(b)}`;
          return aKey.localeCompare(bKey);
        })
        .map((schema) => {
          return {
            typename: Type.getTypename(schema),
            jsonSchema: JsonSchema.toJsonSchema(schema),
            kind: Type.isRelation(schema) ? 'relation' : 'record',
          };
        });
    }),
  ),
);
