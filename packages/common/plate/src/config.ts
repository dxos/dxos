import path from 'path';
import { z } from 'zod';
import { logger } from './util/logger';
import { TEMPLATE_FILE_IGNORE } from './executeFileTemplate';
import { LoadModuleOptions, safeLoadModule } from './util/loadModule';
import { InquirableZodType, InquirableZodObject, InquirablePrimitive } from './util/zodInquire';

export type Config<TInput extends InquirableZodType = InquirableZodType> = {
  include?: (string | RegExp)[];
  exclude?: (string | RegExp)[];
  inputShape?: TInput;
  inherits?: string;
};

const exclude = [/\.t\//, /node_modules/, ...TEMPLATE_FILE_IGNORE];

export const defaultConfig: Config = {
  exclude
};

export type LoadConfigOptions = LoadModuleOptions & {
  verbose?: boolean;
  overrides?: Partial<Config>;
};

export const CONFIG_FILE_BASENAME = 'config.t';

export type StripDefaults<T extends InquirableZodType> = T extends InquirablePrimitive
  ? T
  : T extends InquirableZodObject
  ? { [k in keyof T]: T[k] extends z.ZodDefault<z.ZodTypeAny> ? z.ZodTypeAny : z.ZodTypeAny }
  : T;

export const unDefault = <T extends InquirableZodType = InquirableZodType>(shape: T): InquirableZodType => {
  if (shape instanceof z.ZodIntersection) {
    return z.intersection(unDefault(shape._def.left), unDefault(shape._def.right));
  } else {
    const undefshape = { ...shape._def.shape() };
    for (let i in undefshape) {
      const val = undefshape[i];
      undefshape[i] = val instanceof z.ZodDefault ? val?.removeDefault() : val;
    }
    return z.object(undefshape);
  }
};

export const mergeConfigs = (a: Config, b: Config) => {
  const { include, exclude } = b;
  const merged = {
    ...a,
    ...b
  };
  if (include?.length || a.include?.length) merged.include = [...(a.include ?? []), ...(include ?? [])];
  if (exclude?.length || a.exclude?.length) merged.exclude = [...(a.exclude ?? []), ...(exclude ?? [])];
  return merged as Config;
};

export const prettyConfig = (o?: Config) => {
  if (!o) return o;
  const { inputShape, ...rest } = o;
  return {
    ...rest,
    inputShape: inputShape ? '[ZodObject]' : undefined
  };
}

export const loadConfig = async (templateDirectory: string, options?: LoadConfigOptions): Promise<Config> => {
  const tsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.ts');
  const jsName = path.resolve(templateDirectory, CONFIG_FILE_BASENAME + '.js');
  const { verbose } = { verbose: false, ...options };
  const debug = logger(!!verbose);
  try {
    const module = (await safeLoadModule(tsName, options))?.module ?? (await safeLoadModule(jsName, options))?.module;
    const config = { ...module?.default };
    debug('loaded config', prettyConfig(config));
    const inherited = config.inherits
      ? await loadConfig(path.resolve(templateDirectory, config.inherits), options)
      : undefined;
    debug('inherited config', prettyConfig(inherited));
    debug('default config', prettyConfig(defaultConfig));
    const merged = [defaultConfig, inherited, config, options?.overrides].reduce(
      (memo, next) => (next ? mergeConfigs(memo, next) : memo),
      {}
    );
    debug('merged config', prettyConfig(merged));
    return merged;
  } catch (err: any) {
    if (verbose) console.warn('exception while loading template config:\n' + err.toString());
    debug('default config', prettyConfig(defaultConfig));
    return defaultConfig;
  }
};

export const defineConfig = <I extends InquirableZodType = InquirableZodType>(config: Config<I>) => config;
