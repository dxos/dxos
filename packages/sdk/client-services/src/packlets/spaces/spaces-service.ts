//
// Copyright 2022 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { SpaceManager, SpaceNotFoundError } from '@dxos/echo-db';
import {
  QueryCredentialsRequest,
  QueryMembersRequest,
  QueryMembersResponse,
  Space,
  SpacesService,
  WriteCredentialsRequest,
  WriteCredentialsResponse
} from '@dxos/protocols/proto/dxos/client/services';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

/**
 *
 */
export class SpacesServiceImpl implements SpacesService {
  constructor(private readonly _spaceManager: SpaceManager) {}

  async createSpace(): Promise<Space> {
    throw new Error();
  }

  querySpaces(): Stream<Space> {
    throw new Error();
  }

  queryMembers(query: QueryMembersRequest): Stream<QueryMembersResponse> {
    throw new Error();
  }

  queryCredentials({ spaceKey }: QueryCredentialsRequest): Stream<Credential> {
    return new Stream(({ ctx, next }) => {
      const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));

      const processor = space.spaceState.registerProcessor({
        process: async (credential) => {
          next(credential);
        }
      });
      ctx.onDispose(() => processor.close());
      scheduleTask(ctx, () => processor.open());
    });
  }

  async writeCredentials({ spaceKey, credentials }: WriteCredentialsRequest) {
    const space = this._spaceManager.spaces.get(spaceKey) ?? raise(new SpaceNotFoundError(spaceKey));
    const receipts: WriteCredentialsResponse.WriteReceipt[] = [];
    for (const credential of credentials ?? []) {
      receipts.push(await space.controlPipeline.writer.write({ credential: { credential } }));
    }
    return { receipts };
  }
}
