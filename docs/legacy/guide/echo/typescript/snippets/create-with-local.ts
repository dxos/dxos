//
// Copyright 2022 DXOS.org
//

import { Client, Config } from '@dxos/client';
import { Defaults, Local } from '@dxos/config';

const client = new Client({
  config: new Config(Local(), Defaults()),
});
