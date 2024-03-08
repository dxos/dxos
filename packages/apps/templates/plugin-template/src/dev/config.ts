//
// Copyright 2024 DXOS.org
//

import { Config, Defaults, Envs, Local, Storage } from '@dxos/config';

export const createConfig = async () => {
  return new Config(await Storage(), Envs(), Local(), Defaults());
};
