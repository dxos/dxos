//
// Copyright 2022 DXOS.org
//

import { SubscriptionList } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type EdgeConnection } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { type Halo, create } from '@dxos/protocols';
import {
  type Device,
  DeviceKind,
  DeviceSchema,
  Device_PresenceState,
  EdgeStatus_ConnectionState,
  type QueryDevicesResponse,
  QueryDevicesResponseSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type IdentityManager } from '../identity';

export class DevicesServiceImpl implements Halo.DevicesService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _edgeConnection?: EdgeConnection,
  ) {}

  async updateDevice(profile: DeviceProfileDocument): Promise<Device> {
    const result = await this._identityManager.updateDeviceProfile(profile as any);
    return create(DeviceSchema, result as any);
  }

  queryDevices(): Stream<QueryDevicesResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if (!deviceKeys) {
          next(create(QueryDevicesResponseSchema, { devices: [] }));
        } else {
          invariant(this._identityManager.identity?.presence, 'presence not present');
          const peers = this._identityManager.identity.presence.getPeersOnline();
          next(
            create(QueryDevicesResponseSchema, {
              devices: Array.from(deviceKeys.entries()).map(([key, profile]) => {
                const isMe = this._identityManager.identity?.deviceKey.equals(key);
                let presence;
                if (isMe) {
                  presence = Device_PresenceState.ONLINE;
                } else if (profile.os?.toUpperCase() === 'EDGE') {
                  presence =
                    this._edgeConnection?.status.state === EdgeStatus_ConnectionState.CONNECTED
                      ? Device_PresenceState.ONLINE
                      : Device_PresenceState.OFFLINE;
                } else {
                  presence = peers.some((peer) => peer.identityKey.equals(key))
                    ? Device_PresenceState.ONLINE
                    : Device_PresenceState.OFFLINE;
                }

                return create(DeviceSchema, {
                  deviceKey: key as any,
                  kind: this._identityManager.identity?.deviceKey.equals(key) ? DeviceKind.CURRENT : DeviceKind.TRUSTED,
                  profile: profile as any,
                  presence,
                });
              }),
            }),
          );
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

      return () => subscriptions.clear();
    });
  }
}
