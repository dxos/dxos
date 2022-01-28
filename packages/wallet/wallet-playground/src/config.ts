//
// Copyright 2021 DXOS.org
//

import { Config, Envs, Defaults, Dynamics } from '@dxos/config';
import { ConfigProvider } from '@dxos/react-client';

export const configProvider: ConfigProvider = async () => new Config(
  await Dynamics(),
  Defaults(),
  Envs()
);
