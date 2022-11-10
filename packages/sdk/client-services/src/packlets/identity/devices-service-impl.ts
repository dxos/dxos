import { EventSubscriptions } from "@dxos/async";
import { Stream } from "@dxos/codec-protobuf";
import { Device, DevicesService, QueryDevicesResponse } from "@dxos/protocols/proto/dxos/client/services";
import { Identity } from "./identity";
import { IdentityManager } from "./identity-manager";

export class DevicesServiceImpl implements DevicesService {
  constructor(private readonly _identityManager: IdentityManager) {}

  updateDevice (): Promise<Device> {
    throw new Error('Method not implemented.');
  }

  queryDevices (): Stream<QueryDevicesResponse> {
    return new Stream(({ next }) => {
      const update = () => {
        const deviceKeys = this._identityManager.identity?.authorizedDeviceKeys;
        if(!deviceKeys) {
          next({ devices: [] });
        } else {
          next({
            devices: Array.from(deviceKeys.values()).map(key => ({
              deviceKey: key,
            }))
          })
        }
      }

      const dispose = new EventSubscriptions();

      dispose.add(this._identityManager.stateUpdate.on(() => {
        update();

        if(this._identityManager.identity) {
          dispose.add(this._identityManager.identity.stateUpdate.on(() => {
            update();
          }));
        }
      }));

      update();

      return () => dispose.clear();
    })
  }
}