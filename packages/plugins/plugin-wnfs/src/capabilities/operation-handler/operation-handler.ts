//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';

import { upload } from '../../helpers';
import { WnfsCapabilities, WnfsFile, WnfsOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: WnfsOperation.Create,
        handler: ({ name, type, cid }) =>
          Effect.succeed({
            object: WnfsFile.make({ name, type, cid }),
          }),
      }),
      OperationResolver.make({
        operation: WnfsOperation.Upload,
        handler: ({ file, db }) =>
          Effect.gen(function* () {
            const client = context.getCapability(ClientCapabilities.Client);
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found');
            const blockstore = context.getCapability(WnfsCapabilities.Blockstore);
            const info = yield* Effect.promise(() => upload({ file, blockstore, space }));
            return info;
          }),
      }),
      OperationResolver.make({
        operation: WnfsOperation.CreateFile,
        handler: ({ file, db }) =>
          Effect.gen(function* () {
            const client = context.getCapability(ClientCapabilities.Client);
            const space = client.spaces.get(db.spaceId);
            invariant(space, 'Space not found');
            const blockstore = context.getCapability(WnfsCapabilities.Blockstore);
            const info = yield* Effect.promise(() => upload({ file, blockstore, space }));
            return {
              object: WnfsFile.make({ name: info.name, type: info.type, cid: info.cid }),
            };
          }),
      }),
    ]),
  ),
);

