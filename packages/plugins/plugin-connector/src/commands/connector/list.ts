//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, Common, printList, spaceLayer, withTypes } from '@dxos/cli-util';
import { Database, Filter } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { Connection } from '../../types';
import { printConnection } from './util';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  () =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const connections = yield* Database.query(Filter.type(Connection.Connection)).run;

      if (json) {
        const safe = connections.map((connection) => ({
          id: connection.id,
          name: connection.name,
          connectorId: connection.connectorId,
        }));
        yield* Console.log(JSON.stringify(safe, null, 2));
      } else {
        yield* Console.log(printList(connections.map(printConnection)));
      }
    }),
).pipe(
  Command.withDescription('List all connections.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken, Connection.Connection)),
);
