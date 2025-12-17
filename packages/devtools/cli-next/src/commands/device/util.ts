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
  FormBuilder.of({ title: getDeviceTitle(device) })
    .set({ key: 'deviceKey', value: device.deviceKey.truncate() })
    .set({ key: 'label', value: device.profile?.label ?? '<none>' })
    .set({ key: 'type', value: device.profile?.type ? DeviceType[device.profile?.type] : 'UNKNOWN' })
    .set({ key: 'kind', value: DeviceKind[device.kind] })
    .set({
      key: 'presence',
      value: device?.kind === DeviceKind.CURRENT ? 'THIS DEVICE' : Device.PresenceState[device.presence],
    })
    .set({ key: 'platform', value: device.profile?.platform ?? '<none>' })
    .set({ key: 'platformVersion', value: device.profile?.platformVersion ?? '<none>' })
    .set({ key: 'architecture', value: device.profile?.architecture ?? '<none>' })
    .set({ key: 'os', value: device.profile?.os ?? '<none>' })
    .set({ key: 'osVersion', value: device.profile?.osVersion ?? '<none>' })
    .build();

export const printDevices = (devices: Device[]) => {
  return devices.map(printDevice);
};
