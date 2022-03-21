//
// Copyright 2021 DXOS.org
//

import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

export const configProvider = async () => new Config(await Dynamics(), Defaults(), Envs());
