//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { Device, DeviceKind, DevicesService, QueryDevicesResponse } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { IdentityManager } from '../identity';

export class DevicesServiceImpl implements DevicesService {
  constructor(private readonly _identityManager: IdentityManager) {}

  async updateDevice(profile: ProfileDocument): Promise<Device> {
    invariant(this._identityManager.identity, 'Identity not initialized');
    const deviceKey = this._identityManager.identity.deviceKey;
    await this._identityManager.updateDevice({
      deviceKey,
      profile,
    });

    return {
      deviceKey,
      kind: DeviceKind.CURRENT,
      profile,
    };
  }

  queryDevices(): Stream<QueryDevicesResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if (!deviceKeys) {
          next({ devices: [] });
        } else {
          next({
            devices: Array.from(deviceKeys.entries()).map(([key, profile]) => ({
              deviceKey: key,
              kind: this._identityManager.identity?.deviceKey.equals(key) ? DeviceKind.CURRENT : DeviceKind.TRUSTED,
              profile,
            })),
          });
        }
      };

      const subscriptions = new EventSubscriptions();
      subscriptions.add(
        this._identityManager.stateUpdate.on(() => {
          update();

          if (this._identityManager.identity) {
            subscriptions.add(
              this._identityManager.identity.stateUpdate.on(() => {
                update();
              }),
            );
          }
        }),
      );

      update();

      return () => subscriptions.clear();
    });
  }
}
