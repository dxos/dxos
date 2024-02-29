//
// Copyright 2023 DXOS.org
//

export type { Halo } from '@dxos/client-protocol';
// TODO(burdon): Remove (create wrapper class).
// export { generateSeedPhrase } from '@dxos/credentials';
export { type Contact, type Device, DeviceKind, type Identity } from '@dxos/protocols/proto/dxos/client/services';
export { type Credential, DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

export { HaloProxy } from './halo-proxy';
