//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Rpc } from '@dxos/protocols';
import { EMPTY, decodePublicKey } from '@dxos/protocols/buf';
import { DeviceKind, DevicesService, IdentityService } from '@dxos/protocols/buf/dxos/client/services_pb';

export const setIdentityTags = ({
  identityService,
  devicesService,
  setTag,
}: {
  identityService: Rpc.BufRpcClient<typeof IdentityService>;
  devicesService: Rpc.BufRpcClient<typeof DevicesService>;
  setTag: (k: string, v: string) => void;
}) => {
  identityService.queryIdentity(EMPTY).subscribe((idqr) => {
    if (!idqr?.identity?.identityKey) {
      log('empty response from identity service', { idqr });
      return;
    }

    setTag('identityKey', decodePublicKey(idqr.identity.identityKey).truncate());
  });

  devicesService.queryDevices(EMPTY).subscribe((dqr) => {
    if (!dqr || !dqr.devices || dqr.devices.length === 0) {
      log('empty response from device service', { device: dqr });
      return;
    }
    invariant(dqr, 'empty response from device service');

    const thisDevice = dqr.devices.find((device) => device.kind === DeviceKind.CURRENT);
    if (!thisDevice) {
      log('no current device', { device: dqr });
      return;
    }
    invariant(thisDevice.deviceKey, 'device key not found');
    setTag('deviceKey', decodePublicKey(thisDevice.deviceKey).truncate());
  });
};
