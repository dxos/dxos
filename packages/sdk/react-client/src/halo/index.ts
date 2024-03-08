//
// Copyright 2022 DXOS.org
//

// NOTE: Export * fails here.
export {
  type Contact,
  Device,
  DeviceKind,
  DeviceType,
  type Identity,
  // generateSeedPhrase,
  type Halo,
  HaloProxy,
} from '@dxos/client/halo';

export * from './useContacts';
export * from './useDevices';
export * from './useHaloInvitations';
export * from './useIdentity';
export * from './useKeyStore';
