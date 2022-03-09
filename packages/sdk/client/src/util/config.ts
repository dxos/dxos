//
// Copyright 2021 DXOS.org
//

import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

/**
 * Helper to build config from the files supported by the config plugins.
 */
export const configProvider = async () => new Config(await Dynamics(), Envs(), Defaults());
