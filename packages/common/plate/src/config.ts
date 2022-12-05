import path from 'path';
import { z } from 'zod';

import { LoadModuleOptions, safeLoadModule } from './loadModule';

import { TEMPLATE_FILE_IGNORE } from './executeFileTemplate';

export type Config = {
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  inputShape?: z.AnyZodObject;
};

const exclude = [/\/.t\//, ...TEMPLATE_FILE_IGNORE];

export const defaultConfig: Config = {
  exclude
};

export type LoadConfigOptions = LoadModuleOptions & {
  verbose?: boolean;
};

export const CONFIG_FILE_BASENAME = 'config.t';

export const loadConfig = async (templateDirectory: string, options?: LoadConfigOptions): Promise<Config> => {
  const tsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.ts');
  const jsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.js');
  const { verbose } = { ...options };
  try {
    const module = (await safeLoadModule(tsName, options))?.module ?? (await safeLoadModule(jsName, options))?.module;
    const config = { ...defaultConfig, ...module?.default };
    return {
      ...config,
      exclude: module?.default?.exclude ? [...exclude, ...(config.exclude ?? [])] : config.exclude
    } as Config;
  } catch (err: any) {
    if (verbose) console.warn('exception while loading template config:\n' + err.toString());
    return defaultConfig;
  }
};

export const defineConfig = (config: Config) => config;
