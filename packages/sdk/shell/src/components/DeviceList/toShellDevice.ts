//
// Copyright 2026 DXOS.org
//

import { type Device as ClientDevice, Device, DeviceKind, DeviceType } from '@dxos/react-client/halo';

import { type ShellDevice } from './DeviceListProps';

const KINDS: Record<DeviceType, ShellDevice['kind']> = {
  [DeviceType.UNKNOWN]: 'unknown',
  [DeviceType.BROWSER]: 'browser',
  [DeviceType.NATIVE]: 'native',
  [DeviceType.MOBILE]: 'mobile',
  [DeviceType.AGENT]: 'agent',
  [DeviceType.AGENT_MANAGED]: 'agent-managed',
};

const PRESENCE: Record<Device.PresenceState, ShellDevice['presence']> = {
  [Device.PresenceState.ONLINE]: 'online',
  [Device.PresenceState.OFFLINE]: 'offline',
  [Device.PresenceState.REMOVED]: 'removed',
};

/**
 * Projects a client `Device` onto the structural shape {@link ShellDevice} that the device list
 * renders, so the same item component serves client- and HALO-backed callers.
 */
export const toShellDevice = (device: ClientDevice): ShellDevice => ({
  key: device.deviceKey.toHex(),
  kind: device.profile?.type !== undefined ? KINDS[device.profile.type] : undefined,
  label: device.profile?.label,
  os: device.profile?.os,
  platform: device.profile?.platform,
  current: device.kind === DeviceKind.CURRENT,
  presence: PRESENCE[device.presence],
});
