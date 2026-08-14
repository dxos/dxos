//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, JsonSchema, Query, Scope, Type, View } from '@dxos/echo';

import { SchemaList } from './definitions';

// TODO(dmaretskyi): This is a balance between not filling the agent's context with too many types and not excluding important types.
const EXCLUDED_TYPES = [Type.Type, View.View, Instructions.Instructions, Skill.Skill, Feed.Feed];
const excludedTypenames = EXCLUDED_TYPES.map((type) => Type.getTypename(type));

export default SchemaList.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ typenames }) {
      const types = yield* Database.query(Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()))
        .run;
      const sorted = [...types]
        .filter((schema) => !excludedTypenames.includes(Type.getTypename(schema)))
        .sort((a, b) => {
          const aKey = `${Type.getTypename(a)}:${Type.getVersion(a)}`;
          const bKey = `${Type.getTypename(b)}:${Type.getVersion(b)}`;
          return aKey.localeCompare(bKey);
        });

      if (typenames && typenames.length > 0) {
        const requested = new Set(typenames);
        return sorted
          .filter((schema) => requested.has(Type.getTypename(schema)))
          .map((schema) => ({
            typename: Type.getTypename(schema),
            kind: Type.isRelation(schema) ? 'relation' : 'record',
            jsonSchema: JsonSchema.toJsonSchema(schema),
          }));
      }

      return sorted.map((schema) => {
        const jsonSchema = JsonSchema.toJsonSchema(schema);
        return {
          typename: Type.getTypename(schema),
          kind: Type.isRelation(schema) ? 'relation' : 'record',
          name: jsonSchema.title ?? Type.getTypename(schema),
          description: jsonSchema.description,
          fields: Object.keys(jsonSchema.properties ?? {}),
        };
      });
    }),
  ),
);
