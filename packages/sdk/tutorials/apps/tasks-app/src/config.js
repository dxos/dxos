//
// Copyright 2021 DXOS.org
//

import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

const config = async () => new Config(
  await Dynamics(),
  Envs(),
  Defaults()
);

export const initConfig = () => config().then(({ values }) => values);
