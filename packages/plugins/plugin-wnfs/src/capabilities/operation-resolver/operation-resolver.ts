//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { OperationResolver } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Collection } from '@dxos/schema';

import { upload } from '../../helpers';
import { WnfsCapabilities, WnfsFile, WnfsOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: WnfsOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ rootCollection }) {
          const collection = Collection.makeManaged({ key: Type.getTypename(WnfsFile.File) });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(collection));
          });
        }),
      }),
      OperationResolver.make({
        operation: WnfsOperation.Create,
        handler: ({ name, type, cid }) =>
          Effect.succeed({
            object: WnfsFile.make({ name, type, cid }),
          }),
      }),
      OperationResolver.make({
        operation: WnfsOperation.Upload,
        handler: Effect.fnUntraced(function* ({ file, db }) {
          const client = yield* Capability.get(ClientCapabilities.Client);
          const blockstore = yield* Capability.get(WnfsCapabilities.Blockstore);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');
          const info = yield* Effect.promise(() => upload({ file, blockstore, space }));
          return info;
        }),
      }),
      OperationResolver.make({
        operation: WnfsOperation.CreateFile,
        handler: Effect.fnUntraced(function* ({ file, db }) {
          const client = yield* Capability.get(ClientCapabilities.Client);
          const blockstore = yield* Capability.get(WnfsCapabilities.Blockstore);
          const space = client.spaces.get(db.spaceId);
          invariant(space, 'Space not found');
          const info = yield* Effect.promise(() => upload({ file, blockstore, space }));
          return {
            object: WnfsFile.make({ name: info.name, type: info.type, cid: info.cid }),
          };
        }),
      }),
    ]);
  }),
);
