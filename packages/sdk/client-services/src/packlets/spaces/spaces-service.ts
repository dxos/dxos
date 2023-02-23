//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { raise, todo } from '@dxos/debug';
import { DataServiceSubscriptions, SpaceManager, SpaceNotFoundError } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import {
  QueryCredentialsRequest,
  QuerySpacesResponse,
  Space,
  SpaceMember,
  SpacesService,
  SpaceStatus,
  UpdateSpaceRequest,
  WriteCredentialsRequest
} from '@dxos/protocols/proto/dxos/client/services';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { humanize, Provider } from '@dxos/util';

import { IdentityManager } from '../identity';
import { DataSpace } from './data-space';
import { DataSpaceManager } from './data-space-manager';

/**
 *
 */
export class SpacesServiceImpl implements SpacesService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _getDataSpaceManager: Provider<Promise<DataSpaceManager>>
  ) {}

  async createSpace(): Promise<Space> {
    if (!this._identityManager.identity) {
      throw new Error('This device has no HALO identity available. See https://docs.dxos.org/guide/halo');
    }
    const dataSpaceManager = await this._getDataSpaceManager();
    const space = await dataSpaceManager.createSpace();
    return this._transformSpace(space);
  }

  async updateSpace(request: UpdateSpaceRequest) {
    todo();
  }

  querySpaces(): Stream<QuerySpacesResponse> {
    return new Stream<QuerySpacesResponse>(({ next, ctx }) => {
      const onUpdate = async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const spaces = Array.from(dataSpaceManager.spaces.values())
          // Skip spaces without data service available.
          .filter((space) => this._dataServiceSubscriptions.getDataService(space.key))
          .map((space) => this._transformSpace(space));
        log('update', { spaces });
        next({ spaces });
      };

      setTimeout(async () => {
        const dataSpaceManager = await this._getDataSpaceManager();
        const subscriptions = new EventSubscriptions();
        // TODO(dmaretskyi): Create a pattern for subscribing to a set of objects.
        const subscribeSpaces = () => {
          subscriptions.clear();

          for (const space of dataSpaceManager.spaces.values()) {
            if (!this._dataServiceSubscriptions.getDataService(space.key)) {
              // Skip spaces without data service available.
              continue;
            }

            subscriptions.add(space.stateUpdate.on(ctx, onUpdate));
            subscriptions.add(space.presence.updated.on(ctx, onUpdate));
          }
        };

        dataSpaceManager.updated.on(ctx, () => {
          subscribeSpaces();
          void onUpdate();
        });

        ctx.onDispose(() => subscriptions.clear());
        scheduleTask(ctx, () => {
          subscribeSpaces();
          void onUpdate();
        });
      });

      if (!this._identityManager.identity) {
        next({ spaces: [] });
      }
    });
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
    for (const credential of credentials ?? []) {
      await space.controlPipeline.writer.write({ credential: { credential } });
    }
  }

  private _transformSpace(space: DataSpace): Space {
    return {
      spaceKey: space.key,
      status: space.isOpen ? SpaceStatus.ACTIVE : SpaceStatus.INACTIVE,
      members: Array.from(space.inner.spaceState.members.values()).map((member) => ({
        identity: {
          identityKey: member.key,
          profile: {
            displayName: member.assertion.profile?.displayName ?? humanize(member.key)
          }
        },
        presence:
          this._identityManager.identity?.identityKey.equals(member.key) ||
          space.presence.getPeersOnline().filter(({ identityKey }) => identityKey.equals(member.key)).length > 0
            ? SpaceMember.PresenceState.ONLINE
            : SpaceMember.PresenceState.OFFLINE
      }))
    };
  }
}
