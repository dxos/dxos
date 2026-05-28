//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, Common, getSpace, printList, spaceIdWithDefault } from '@dxos/cli-util';
import { type Key, Type } from '@dxos/echo';
import { getTypeAnnotation } from '@dxos/echo/internal';

import { createTypenameFilter, mapSchemas, printSchemas } from './util';

export const handler = Effect.fn(function* ({
  spaceId,
  typename,
}: {
  spaceId: Option.Option<string>;
  typename: Option.Option<string>;
}) {
  const { json } = yield* CommandConfig;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  const types = yield* Effect.sync(() => space.db.graph.registry.list().filter(Type.isType));
  const allSchemas = [...types];

  const schemas = allSchemas
    .map((schema) => {
      const schemaAnnotation = getTypeAnnotation(Type.getSchema(schema));
      return {
        id: Type.getDXN(schema)?.toString(),
        typename: schemaAnnotation?.typename ?? Type.getTypename(schema) ?? '',
        version: schemaAnnotation?.version ?? Type.getVersion(schema) ?? '',
      };
    })
    .filter(createTypenameFilter(Option.getOrUndefined(typename)));

  if (json) {
    yield* Console.log(JSON.stringify(mapSchemas(schemas), null, 2));
  } else {
    const formatted = printSchemas(schemas);
    yield* Console.log(printList(formatted));
  }
});

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    typename: Options.text('typename').pipe(Options.withDescription('Filter schemas by typename.'), Options.optional),
  },
  handler,
).pipe(Command.withDescription('List space schemas.'));
