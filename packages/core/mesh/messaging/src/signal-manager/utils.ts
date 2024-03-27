//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type DevicesService, type IdentityService } from '@dxos/protocols/proto/dxos/client/services';
import { DeviceKind } from '@dxos/protocols/proto/dxos/client/services';

export const setIdentityTags = ({
  identityService,
  devicesService,
  setTag,
}: {
  identityService: IdentityService;
  devicesService: DevicesService;
  setTag: (k: string, v: string) => void;
}) => {
  identityService.queryIdentity().subscribe((idqr) => {
    if (!idqr?.identity?.identityKey) {
      log('empty response from identity service', { idqr });
      return;
    }

    setTag('identityKey', idqr.identity.identityKey.truncate());
  });

  devicesService.queryDevices().subscribe((dqr) => {
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
    setTag('deviceKey', thisDevice.deviceKey.truncate());
  });
};
