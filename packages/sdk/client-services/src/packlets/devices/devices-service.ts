//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList } from '@dxos/async';
import { type EdgeConnection } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import {
  Device,
  DeviceKind,
  EdgeStatus,
  type QueryDevicesResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DevicesService } from '@dxos/protocols/rpc';

import { type IdentityManager } from '../identity';

export class DevicesServiceImpl implements DevicesService.Handlers {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  ['DevicesService.updateDevice'](request: DeviceProfileDocument): Effect.Effect<Device, Error> {
    return Effect.tryPromise({
      try: async () => this._identityManager.updateDeviceProfile(request),
      catch: (error) => error as Error,
    });
  }

  ['DevicesService.queryDevices'](): EffectStream.Stream<QueryDevicesResponse, Error> {
    return EffectStream.async<QueryDevicesResponse, Error>((emit) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if (!deviceKeys) {
          void emit.single({ devices: [] });
        } else {
          invariant(this._identityManager.identity?.presence, 'presence not present');
          const peers = this._identityManager.identity.presence.getPeersOnline();
          void emit.single({
            devices: Array.from(deviceKeys.entries()).map(([key, profile]) => {
              const isMe = this._identityManager.identity?.deviceKey.equals(key);
              let presence;
              if (isMe) {
                presence = Device.PresenceState.ONLINE;
              } else if (profile.os?.toUpperCase() === 'EDGE') {
                presence =
                  this._edgeConnection?.status.state === EdgeStatus.ConnectionState.CONNECTED
                    ? Device.PresenceState.ONLINE
                    : Device.PresenceState.OFFLINE;
              } else {
                presence = peers.some((peer) => peer.identityKey.equals(key))
                  ? Device.PresenceState.ONLINE
                  : Device.PresenceState.OFFLINE;
              }

              return {
                deviceKey: key,
                kind: this._identityManager.identity?.deviceKey.equals(key) ? DeviceKind.CURRENT : DeviceKind.TRUSTED,
                profile,
                presence,
              };
            }),
          });
        }
      };

      let identitySubscribed = false;
      let presenceSubscribed = false;
      const subscribeIdentity = () => {
        if (!identitySubscribed) {
          this._identityManager.identity?.stateUpdate.on(() => {
            update();
          });
          identitySubscribed = true;
        }
      };

      const subscribePresence = () => {
        if (!presenceSubscribed) {
          this._identityManager.identity?.presence?.updated.on(() => {
            update();
          });
          presenceSubscribed = true;
        }
      };

      const subscriptions = new SubscriptionList();

      if (this._identityManager.identity) {
        subscribeIdentity();
        subscribePresence();
      }

      subscriptions.add(
        this._identityManager.stateUpdate.on(() => {
          update();

          if (this._identityManager.identity) {
            subscribeIdentity();
            subscribePresence();
          }
        }),
      );

      update();

      return Effect.sync(() => subscriptions.clear());
    });
  }
}
