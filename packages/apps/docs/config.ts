//
// Copyright 2022 DXOS.org
//

import 'regenerator-runtime';

import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

export const configProvider = async () => new Config(await Dynamics(), Envs(), Defaults());
