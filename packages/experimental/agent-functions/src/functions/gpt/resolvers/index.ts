//
// Copyright 2024 DXOS.org
//

import type { Config } from '@dxos/config';

import { createResolver as discord } from './discord';
import { type ResolverMap } from './type';

export * from './type';

// TODO(burdon): Deferred constructor.
export const createResolvers = async (config: Config): Promise<ResolverMap> => ({
  discord: await discord(config),
});
