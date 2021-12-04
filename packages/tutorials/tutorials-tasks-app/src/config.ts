//
// Copyright 2021 DXOS.org
//

import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

export const initConfig = async () => new Config(
  await Dynamics(),
  Envs(),
  Defaults()
);
