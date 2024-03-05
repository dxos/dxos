//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import {
  Device,
  DeviceKind,
  type DevicesService,
  type QueryDevicesResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { type DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type IdentityManager } from '../identity';

export class DevicesServiceImpl implements DevicesService {
  constructor(private readonly _identityManager: IdentityManager) {}

  async updateDevice(profile: DeviceProfileDocument): Promise<Device> {
    return this._identityManager.updateDeviceProfile(profile);
  }

  queryDevices(): Stream<QueryDevicesResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if (!deviceKeys) {
          next({ devices: [] });
        } else {
          invariant(this._identityManager.identity?.presence, 'presence not present');
          const peers = this._identityManager.identity.presence.getPeersOnline();
          next({
            devices: Array.from(deviceKeys.entries()).map(([key, profile]) => {
              const isMe = this._identityManager.identity?.deviceKey.equals(key);
              const peerState = peers.find((peer) => peer.identityKey.equals(key));

              return {
                deviceKey: key,
                kind: this._identityManager.identity?.deviceKey.equals(key) ? DeviceKind.CURRENT : DeviceKind.TRUSTED,
                profile,
                presence: isMe
                  ? Device.PresenceState.ONLINE
                  : peerState
                    ? Device.PresenceState.ONLINE
                    : Device.PresenceState.OFFLINE,
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

      const subscriptions = new EventSubscriptions();

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

      return () => subscriptions.clear();
    });
  }
}
