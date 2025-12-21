//
// Copyright 2025 DXOS.org
//

import { Device, DeviceKind, DeviceType } from '@dxos/client/halo';

import { FormBuilder } from '../../util';

const maybeTruncateKey = (key: { toHex(): string; truncate(): string }, truncate = false) =>
  truncate ? key.truncate() : key.toHex();

const getDeviceTitle = (device: Device): string => {
  if (device.profile?.label) {
    return device.profile.label;
  }
  const platform = device.profile?.platform ?? 'Unknown';
  const os = device.profile?.os ?? 'Unknown';
  return `${platform} on ${os}`;
};

export const mapDevices = (devices: Device[], truncateKeys = false) => {
  return devices.map((device) => ({
    label: device.profile?.label,
    type: device.profile?.type ? DeviceType[device.profile?.type] : 'UNKNOWN',
    key: maybeTruncateKey(device.deviceKey, truncateKeys),
    kind: DeviceKind[device.kind],
    platform: device.profile?.platform,
    platformVersion: device.profile?.platformVersion,
    architecture: device.profile?.architecture,
    os: device.profile?.os,
    osVersion: device.profile?.osVersion,
    presence: device?.kind === DeviceKind.CURRENT ? 'THIS DEVICE' : Device.PresenceState[device.presence],
  }));
};

export const printDevice = (device: Device) =>
  FormBuilder.make({ title: getDeviceTitle(device) }).pipe(
    FormBuilder.set('deviceKey', device.deviceKey.truncate()),
    FormBuilder.set('label', device.profile?.label ?? '<none>'),
    FormBuilder.set('type', device.profile?.type ? DeviceType[device.profile?.type] : 'UNKNOWN'),
    FormBuilder.set('kind', DeviceKind[device.kind]),
    FormBuilder.set(
      'presence',
      device?.kind === DeviceKind.CURRENT ? 'THIS DEVICE' : Device.PresenceState[device.presence],
    ),
    FormBuilder.set('platform', device.profile?.platform ?? '<none>'),
    FormBuilder.set('platformVersion', device.profile?.platformVersion ?? '<none>'),
    FormBuilder.set('architecture', device.profile?.architecture ?? '<none>'),
    FormBuilder.set('os', device.profile?.os ?? '<none>'),
    FormBuilder.set('osVersion', device.profile?.osVersion ?? '<none>'),
    FormBuilder.build,
  );

export const printDevices = (devices: Device[]) => {
  return devices.map(printDevice);
};
