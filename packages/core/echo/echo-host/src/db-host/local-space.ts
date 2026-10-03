//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Context } from '@dxos/context';
import { type BaseError } from '@dxos/errors';
import { toServiceError } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { type Space, Space_PipelineStateSchema, SpaceSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

import { type EchoHost } from './echo-host.ts';

/**
 * Answers `SpacesService.createSpace` for a request naming a local space: the space as the client
 * opens any other, by id and directory, with no key or members because it has none.
 */
export const createLocalSpace = (host: EchoHost, name: string): Effect.Effect<Space, BaseError> =>
  Effect.tryPromise({
    try: async () => {
      const { spaceId, root } = await host.openLocalSpace(Context.default(), name);
      return buf.create(SpaceSchema, {
        id: spaceId,
        state: SpaceState.SPACE_READY,
        pipeline: buf.create(Space_PipelineStateSchema, { directoryUrl: root.url }),
      });
    },
    catch: toServiceError,
  });
