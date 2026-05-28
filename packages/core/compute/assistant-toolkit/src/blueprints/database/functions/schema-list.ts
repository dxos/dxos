//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Routine, Blueprint, Operation } from '@dxos/compute';
import { Database, Feed, Type, View } from '@dxos/echo';
import { log } from '@dxos/log';

import { SchemaList } from './definitions';

// TODO(dmaretskyi): This is a balance between not filling the agent's context with too many types and not excluding important types.
const EXCLUDED_TYPES = [Type.Type, View.View, Routine.Routine, Blueprint.Blueprint, Feed.Feed];
const excludedTypenames = EXCLUDED_TYPES.map((type) => Type.getTypename(type));

export default SchemaList.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      const { db } = yield* Database.Service;
      const schema = yield* Effect.promise(() => db.schemaRegistry.query({ location: ['database', 'runtime'] }).run());
      return schema
        .filter((type) => !excludedTypenames.includes(Type.getTypename(type)))
        .flatMap((type) => {
          try {
            return [
              {
                typename: Type.getTypename(type),
                jsonSchema: type.jsonSchema,
                kind: Type.isRelation(type) ? 'relation' : 'record',
              },
            ];
          } catch (err) {
            log.warn('Failed to generate JSON schema for type', { typename: Type.getTypename(type), err });
            return [];
          }
        });
    }),
  ),
);
