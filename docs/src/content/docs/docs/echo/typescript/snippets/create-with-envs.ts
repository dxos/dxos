//
// Copyright 2022 DXOS.org
//

import { Client, Config } from '@dxos/client';
import { Defaults, Envs, Local } from '@dxos/config';

const _client = new Client({
  config: new Config(Envs(), Local(), Defaults()),
});
