//
// Copyright 2022 DXOS.org
//

import { scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { SpaceManager, SpaceNotFoundError } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import {
  CredentialsBatch,
  QueryCredentialsRequest,
  QueryMembersRequest,
  QueryMembersResponse,
  Space,
  SpacesService
} from '@dxos/protocols/proto/dxos/client/services';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { IdentityManager } from '../identity';

/**
 *
 */
export class SpacesServiceImpl implements SpacesService {
  constructor(private readonly _spaceManager: SpaceManager, private readonly _identityManager: IdentityManager) {}

  async createSpace(): Promise<Space> {
    throw new Error();
  }

  querySpaces(): Stream<Space> {
    throw new Error();
  }

  queryMembers(query: QueryMembersRequest): Stream<QueryMembersResponse> {
    throw new Error();
  }

  async getHaloSpaceKey(): Promise<PublicKey> {
    if (!this._identityManager.identity) {
      throw new Error('Identity not initialized.');
    }
    return this._identityManager.identity.space.key;
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

  async writeHaloCredentials(credentialsBatch: CredentialsBatch) {
    if (!this._identityManager.identity) {
      throw new Error('Identity not initialized.');
    }
    for (const credential of credentialsBatch.credentials ?? []) {
      await this._identityManager.identity.controlPipeline.writer.write({ credential: { credential } });
    }
  }
}
