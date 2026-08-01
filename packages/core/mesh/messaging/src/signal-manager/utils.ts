//
// Copyright 2024 DXOS.org
//

import * as Runtime from 'effect/Runtime';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { subscribeStream } from '@dxos/protocols';
import { DeviceKind } from '@dxos/protocols/proto/dxos/client/services';
import { type DevicesService, type IdentityService } from '@dxos/protocols/rpc';

export const setIdentityTags = ({
  identityService,
  devicesService,
  runtime = Runtime.defaultRuntime,
  setTag,
}: {
  identityService: IdentityService.Client;
  devicesService: DevicesService.Client;
  runtime?: Runtime.Runtime<never>;
  setTag: (k: string, v: string) => void;
}) => {
  subscribeStream(runtime, identityService.IdentityService.queryIdentity(undefined), {
    onData: (idqr) => {
      if (!idqr?.identity?.identityKey) {
        log('empty response from identity service', { idqr });
        return;
      }

      setTag('identityKey', idqr.identity.identityKey.truncate());
    },
  });

  subscribeStream(runtime, devicesService.DevicesService.queryDevices(undefined), {
    onData: (dqr) => {
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
    },
  });
};
