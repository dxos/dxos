//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { ChessComAccount, ChessComOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(ChessComAccount.Account),
      inputSchema: ChessComAccount.CreateAccountSchema,
      createObject: (props: Schema.Schema.Type<typeof ChessComAccount.CreateAccountSchema>, options) =>
        Effect.gen(function* () {
          const object = ChessComAccount.makeAccount({ username: props.username });
          const result = yield* Operation.invoke(
            SpaceOperation.AddObject,
            {
              object,
              target: options.target,
            },
            { spaceId: options.db.spaceId },
          );
          yield* Operation.schedule(
            ChessComOperation.SyncGames,
            { account: Ref.make(object) },
            { spaceId: Obj.getDatabase(object)?.spaceId },
          );
          return result;
        }),
    });
  }),
);
