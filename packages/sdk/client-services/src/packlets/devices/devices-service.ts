//
// Copyright 2022 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Device, DeviceKind, DevicesService, QueryDevicesResponse } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';

import { IdentityManager } from '../identity';

export class DevicesServiceImpl implements DevicesService {
  constructor(private readonly _identityManager: IdentityManager) {}

  updateDevice(request: ProfileDocument): Promise<Device> {
    throw new Error('Method not implemented.');
  }

  queryDevices(): Stream<QueryDevicesResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if (!deviceKeys) {
          next({ devices: [] });
        } else {
          next({
            devices: Array.from(deviceKeys.values()).map((key) => ({
              deviceKey: key,
              kind: this._identityManager.identity?.deviceKey.equals(key) ? DeviceKind.CURRENT : DeviceKind.TRUSTED,
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
