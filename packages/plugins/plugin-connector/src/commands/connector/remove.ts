//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import { Database, Filter, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { AccessToken, Connection } from '@dxos/types';

import { printConnectionRemoved } from './util';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: Options.text('id').pipe(Options.withDescription('The connection ID.'), Options.optional),
  },
  ({ id }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const connection = yield* Option.match(id, {
        onSome: (value) =>
          Effect.gen(function* () {
            const dxn = EID.make({ entityId: value });
            return yield* Database.resolve(Ref.fromURI(dxn), Connection.Connection);
          }),
        onNone: () =>
          Effect.gen(function* () {
            const connections = yield* Database.query(Filter.type(Connection.Connection)).run;

            if (connections.length === 0) {
              return yield* Effect.fail(new Error('No connections found to remove'));
            }

            const choices = connections.map((connection) => ({
              title: connection.name ?? connection.connectorId ?? connection.id,
              value: connection.id,
            }));

            const selectedId = yield* Prompt.select({
              message: 'Select connection to remove:',
              choices,
            }).pipe(Prompt.run);

            const dxn = EID.make({ entityId: selectedId });
            return yield* Database.resolve(Ref.fromURI(dxn), Connection.Connection);
          }),
      });
      yield* Database.remove(connection);

      if (json) {
        yield* Console.log(
          JSON.stringify(
            {
              removed: connection.id,
              name: connection.name,
              connectorId: connection.connectorId,
            },
            null,
            2,
          ),
        );
      } else {
        yield* Console.log(print(printConnectionRemoved(connection.name ?? connection.connectorId ?? connection.id)));
      }

      yield* flushAndSync();
    }),
).pipe(
  Command.withDescription('Remove a connection. Interactive if no id specified.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(AccessToken.AccessToken, Connection.Connection)),
);
