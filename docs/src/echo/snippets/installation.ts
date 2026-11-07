//
// Copyright 2026 DXOS.org
//

import { Client, Config } from '@dxos/client';
import { Defaults, Envs, Local } from '@dxos/config';

// #region client
const client = new Client();
await client.initialize();
// #endregion

// #region identity
if (!client.halo.identity.get()) {
  await client.halo.createIdentity();
}
// #endregion

// #region space
const space = await client.spaces.create({ name: 'Notes' });
await space.waitUntilReady();
console.log(space.id);
// #endregion

// #region defaults
const fromDefaults = new Client({ config: new Config(Defaults()) });
// #endregion

// #region local
const forLocalDevelopment = new Client({ config: new Config(Local(), Defaults()) });
// #endregion

// #region envs
const fromEnvironment = new Client({ config: new Config(Envs(), Local(), Defaults()) });
// #endregion

export { forLocalDevelopment, fromDefaults, fromEnvironment };
