//
// Copyright 2025 DXOS.org
//

import { Effect, Context, Layer } from 'effect';
import { Space } from '@dxos/client/echo';

// TODO(dmaretskyi): This makes conductor dependent on client.
export class SpaceService extends Context.Tag('SpaceService')<
  SpaceService,
  { readonly spaceId: string | undefined; readonly space: Space | undefined }
>() {
  static empty = Layer.succeed(SpaceService, { spaceId: undefined, space: undefined });

  static fromSpace = (space: Space) => Layer.succeed(SpaceService, { spaceId: space.id, space });
}
