//
// Copyright 2026 DXOS.org
//

import { Client, Config } from '@dxos/client';
import { Defaults, Envs, Local } from '@dxos/config';

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
