//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { type Key } from '@dxos/echo';
import { getTypeAnnotation } from '@dxos/echo/internal';

import { CommandConfig } from '../../../../services';
import { getSpace, printList, spaceIdWithDefault } from '../../../../util';
import { Common } from '../../../options';

import { createTypenameFilter, mapSchemas, printSchemas } from './util';

export const handler = Effect.fn(function* ({
  spaceId,
  typename,
}: {
  spaceId: Option.Option<string>;
  typename: Option.Option<string>;
}) {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;

  const resolvedSpaceId = yield* spaceIdWithDefault(spaceId as Option.Option<Key.SpaceId>);
  const space = yield* getSpace(resolvedSpaceId);

  const echoSchema = yield* Effect.tryPromise(() => space.db.schemaRegistry.query().run());
  const runtimeSchema = space.db.graph.schemaRegistry.schemas;

  const schemas = [
    ...echoSchema.map((schema) => ({
      id: schema.id,
      typename: schema.typename,
      version: schema.version,
    })),
    ...runtimeSchema.map((schema) => {
      const schemaAnnotation = getTypeAnnotation(schema)!;
      return {
        typename: schemaAnnotation.typename,
        version: schemaAnnotation.version,
      };
    }),
  ].filter(createTypenameFilter(Option.getOrUndefined(typename)));

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
