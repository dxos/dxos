//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Config2 } from '@dxos/protocols';

const decodeConfig2 = Schema.decodeUnknownSync(Config2.Config);

/**
 * Loads a `dx.config.ts` through Vite's module runner, for code already running inside a Vite build: unlike
 * {@link loadDxConfig} it compiles any TypeScript and loads the stylesheets the config's imports reach.
 */
export const loadDxConfigWithVite = async (filePath: string, root: string): Promise<Config2.Config> => {
  const { runnerImport } = await import('vite');
  const { module } = await runnerImport<{ default: unknown }>(filePath, { configFile: false, root, logLevel: 'error' });
  // `Config2` is the config's data; the round trip drops its functions as the subprocess loader does.
  return decodeConfig2(JSON.parse(JSON.stringify(module.default)));
};
