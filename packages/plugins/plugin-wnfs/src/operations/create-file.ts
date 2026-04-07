//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { upload } from '../helpers';
import { WnfsCapabilities, WnfsFile } from '../types';

import { CreateFile } from './definitions';

const handler: Operation.WithHandler<typeof CreateFile> = CreateFile.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ file, db }) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const blockstore = yield* Capability.get(WnfsCapabilities.Blockstore);
      const space = client.spaces.get(db.spaceId);
      invariant(space, 'Space not found');
      const info = yield* Effect.promise(() => upload({ file, blockstore, space }));
      return {
        object: WnfsFile.make({ name: info.name, type: info.type, cid: info.cid }),
      };
    }),
  ),
);

export default handler;
