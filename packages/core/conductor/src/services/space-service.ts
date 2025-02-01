//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import { type EchoDatabase } from '@dxos/echo-db';
import { SpaceId } from '@dxos/keys';

export class SpaceService extends Context.Tag('SpaceService')<
  SpaceService,
  { readonly spaceId: SpaceId; readonly db: EchoDatabase }
>() {
  static empty = Layer.succeed(SpaceService, {
    get spaceId(): SpaceId {
      throw new Error('SpaceService not available');
    },
    get db(): EchoDatabase {
      throw new Error('SpaceService not available');
    },
  });
}
