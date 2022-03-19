//
// Copyright 2021 DXOS.org
//

import { Config, ConfigProvider, Envs, Defaults, Dynamics } from '@dxos/config';

/**
 * Helper to build config from the files supported by the config plugins.
 */
// TODO(burdon): Remove or rename defaultConfigProvider.
export const configProvider: ConfigProvider = async () => new Config(await Dynamics(), Envs(), Defaults());
