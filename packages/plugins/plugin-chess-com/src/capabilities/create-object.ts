//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj, Ref, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { ChessComAccount, ChessComOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.provide(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(ChessComAccount.Account),
        inputSchema: ChessComAccount.CreateAccountSchema,
        createObject: (props: Schema.Schema.Type<typeof ChessComAccount.CreateAccountSchema>, options) =>
          Effect.gen(function* () {
            const object = ChessComAccount.makeAccount({ username: props.username });
            const result = yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
            yield* Operation.schedule(
              ChessComOperation.SyncGames,
              { account: Ref.make(object) },
              { spaceId: Obj.getDatabase(object)?.spaceId },
            );
            return result;
          }),
      }),
    ];
  }),
);
